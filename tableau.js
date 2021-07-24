'use strict';
class Tableau {
    static WORD = 5;

    static g_exp = Int8Array.from([
        // bit format: x_1 z_1 x_2 z_2
        0,  0,  0,  0, // x1 = 0, z1 = 0 
        0,  0,  1, -1, // x1 = 0, z1 = 1
        0, -1,  0,  1, // x1 = 1, z1 = 0
        0,  1, -1,  0  // x1 = 1, z1 = 1
    ]);


    constructor(num_qubits) {
        this.num_qubits = num_qubits;
        this.bits = (2*num_qubits+1)*num_qubits;

        const word      = Tableau.WORD;
        const word_bits = -(-this.bits >> word) << word;

        this.bufx  = new ArrayBuffer(word_bits);
        this.bufz  = new ArrayBuffer(word_bits);
        this.bufr  = new ArrayBuffer(-(-(2*num_qubits+1) >> word) << word);

        this.datax = new Uint32Array(this.bufx);
        this.dataz = new Uint32Array(this.bufz);
        this.datar = new Uint32Array(this.bufr);
    }

    /** GET/SET for x **/
    getbitx(row, col) {
        const bitpos = row * this.num_qubits + col;
        const idx    = bitpos >> Tableau.WORD;
        const offset = bitpos - (idx << Tableau.WORD);
        const u8     = this.datax[idx];

        return (u8 & (1 << offset)) >>> offset;
    }

    setbitx(row, col, val) {
        const bitpos = row * this.num_qubits + col;
        const idx    = bitpos >> Tableau.WORD;
        const offset = bitpos - (idx << Tableau.WORD);
        const u8     = this.datax[idx];

        // !!! & has lower precedence than ===
        if ((val & 1) === 0) {
            this.datax[idx] &= ~(1 << offset);
        } else {
            this.datax[idx] |=  (1 << offset);
        }

        return (u8 & (1 << offset)) >>> offset;
    }

    /** GET/SET for z **/
    getbitz(row, col) {
        const bitpos = row * this.num_qubits + col;
        const idx    = bitpos >> Tableau.WORD;
        const offset = bitpos - (idx << Tableau.WORD);
        const u8     = this.dataz[idx];

        return (u8 & (1 << offset)) >>> offset;
    }

    setbitz(row, col, val) {
        const bitpos = row * this.num_qubits + col;
        const idx    = bitpos >> Tableau.WORD;
        const offset = bitpos - (idx << Tableau.WORD);
        const u8     = this.dataz[idx];

        // !!! & has lower precedence than ===
        if ((val & 1) === 0) {
            this.dataz[idx] &= ~(1 << offset);
        } else {
            this.dataz[idx] |=  (1 << offset);
        }

        return (u8 & (1 << offset)) >>> offset;
    }

    /** GET/SET for r **/
    getbitr(row) {
        const idx    = row >> Tableau.WORD;
        const offset = row - (idx << Tableau.WORD);
        const u8     = this.datar[idx];

        return (u8 & (1 << offset)) >>> offset;
    }

    setbitr(row, val) {
        const idx    = row >> Tableau.WORD;
        const offset = row - (idx << Tableau.WORD);
        const u8     = this.datar[idx];

        if ((val & 1) === 0) {
            this.datar[idx] &= ~(1 << offset);
        } else {
            this.datar[idx] |=  (1 << offset);
        }

        return (u8 & (1 << offset)) >>> offset;
    }

    initialize() {
        // initialize tableau with 'identity' matrix
        const num_qubits = this.num_qubits;

        // zero everything
        const wordsx =  this.datax.length;
        const wordsr =  this.datar.length;
        for (let i = 0; i < wordsx; i++) {
            this.datax[i] = 0;
            this.dataz[i] = 0;
        }

        for (let i = 0; i < wordsr; i++)
            this.datar[i] = 0;

        // 1's in the diagonal
        for (let i = 0; i < num_qubits; i++) {
            this.setbitx(i, i, 1);
            this.setbitz(i+num_qubits, i, 1);
        }
    }

    print() {
        const num_qubits = this.num_qubits;
        const n          = 2*num_qubits+1;
        let output = "";

        for (let i = 0; i < n; i++) {
            let line = "(";

            // values for x_ij
            for (let j = 0; j < num_qubits; j++)
                line += `${this.getbitx(i, j)}`.padStart(3, ' ');

            line += "   │ ";
            // values for z_ij
            for (let j = 0; j < num_qubits; j++)
                line += `${this.getbitz(i, j)}`.padStart(3, ' ');

            // value for r_ij
            line += `  | ${this.getbitr(i)}`;


            output += line + ' )\n';
            if (i+1 === num_qubits || i + 2 === n) {
                output += '─'.repeat(line.length+2) + '\n';
            }
        }

        console.log(output);
    }

    rowsum(h, i) {
        //console.log(`rowsum(${h}, ${i})`);
        const num_qubits = this.num_qubits;

        let sum = 2 * (this.getbitr(h) + this.getbitr(i));
        //console.log(`sum = ${sum}`);


        // TODO: write more optimized version using word operations
        for (let j = 0; j < num_qubits; j++) {
            const xij = this.getbitx(i, j);
            const xhj = this.getbitx(h, j);
            const zij = this.getbitz(i, j);
            const zhj = this.getbitz(h, j);

            const xzxz = (xij << 3) | (zij << 2) | (xhj << 1) | (zhj);
            sum  += Tableau.g_exp[xzxz];
            //console.log(`${j}: g = ${Tableau.g_exp[xzxz]}`);

            this.setbitx(h, j, (xij ^ xhj) & 1);
            this.setbitz(h, j, (zij ^ zhj) & 1);
        }

        if (sum % 4 === 0) {
            this.setbitr(h,0);
        } else if ((sum % 4) === 2) {
            // sum should never be = 1,3 (mod 4)
            this.setbitr(h,1);
        }
    }

    cnot(a, b) {
        const num_qubits = this.num_qubits;
        const n1          = 2*num_qubits;

        for (let i = 0; i < n1; i++) {
            const xia = this.getbitx(i, a);
            const zia = this.getbitz(i, a);
            const xib = this.getbitx(i, b);
            const zib = this.getbitz(i, b);
            const ri  = this.getbitr(i);

            // xib
            this.setbitx(i, b, xia ^ xib);
            // zia
            this.setbitz(i, a,  zia ^ zib);
            // ri
            this.setbitr(i, ri ^ (xia*zib *(xib ^ zia ^ 1)));
        }
    }

    h(a) {
        const num_qubits = this.num_qubits;
        const n          = 2*num_qubits+1;

        for (let i = 0; i < n; i++) {
            const xia = this.getbitx(i, a);
            const zia = this.getbitz(i, a);
            const ri  = this.getbitr(i);

            this.setbitr(i, ri ^ (xia * zia));
            // swap xia and zia
            this.setbitx(i, a, zia);
            this.setbitz(i, a, xia);
        }
    }

    p(a) {
        const num_qubits = this.num_qubits;
        const n          = 2*num_qubits+1;

        for (let i = 0; i < n-1; i++) {
            const xia = this.getbitx(i, a);
            const zia = this.getbitz(i, a);
            const ri  = this.getbitr(i);

            this.setbitr(i, ri ^ (xia * zia));
            this.setbitz(i, a, zia ^ xia);
        }
    }

    generators() {
        const num_qubits = this.num_qubits;
        let arr = new Array(num_qubits);

        for (let i = 0; i < 2*num_qubits; i++) {
            let gate = this.getbitr(i) === 1 ? "-" : "+";
            for (let j = 0; j < num_qubits; j++) {
                const xij = this.getbitx(i, j);
                const zij = this.getbitz(i, j);

                switch((xij << 1) | zij) {
                    case 0:
                        gate += "I";
                        break;
                    case 1:
                        gate += "Z";
                        break;
                    case 2:
                        gate += "X";
                        break;
                    case 3:
                        gate += "Y";
                        break;
                }
            }

            arr[i] = gate;
        }

        return arr;
    }


    measure(a) {
        const num_qubits = this.num_qubits;
        const n          = 2*num_qubits+1;
        let measurment   =  0;

        if (a >= num_qubits) {
            throw new Error(`qubit must be between 0 and ${num_qubits-1}`);
        }

        // check for xpa = 1
        let p = -1;
        for (let i = 0; i < num_qubits; i++) {
            if (this.getbitx(i+num_qubits, a) === 1) {
                p = i+num_qubits;
                break;
            }
        }

        if (p >= 0) {
            // outcome is probabilistic
            console.log("probabilistic");
            for (let i = 0; i < n-1; i++) {
                if (i === p || this.getbitx(i, a) !== 1) continue;
                this.rowsum(i, p);
            }

            // copy p-th row over to (p-n)-th row
            let i = p*num_qubits, j = (p-num_qubits)*num_qubits, col = 0;
            const end  = i+num_qubits;
            const step = (1<<Tableau.WORD);
            const mask =  step-1;
            while (i < end) {
                if ((i&mask) === 0 && (j&mask) === 0) {
                    this.datax[j>>Tableau.WORD] = this.datax[i>>Tableau.WORD];
                    this.dataz[j>>Tableau.WORD] = this.dataz[i>>Tableau.WORD];

                    this.datax[i>>Tableau.WORD] = 0;
                    this.dataz[i>>Tableau.WORD] = 0;
                    i += step;
                    j += step;
                    col += step;
                } else {
                    this.setbitx(p-num_qubits, col, this.getbitx(p, col));
                    this.setbitz(p-num_qubits, col, this.getbitz(p, col));

                    this.setbitx(p, col, 0);
                    this.setbitz(p, col, 0);
                    i++, j++, col++;
                }
            }

            while (i < end) {
                this.setbitx(p-num_qubits, col, this.getbitx(p, col));
                this.setbitz(p-num_qubits, col, this.getbitz(p, col));

                this.setbitx(p, col, 0);
                this.setbitz(p, col, 0);
                i++, j++, col++;
            }

            measurment = Math.random() < 0.5 ? 0 : 1;
            this.setbitr(p, measurment);
            this.setbitz(p, a, 1);
        } else {
            // outcome is determinate
            console.log("deterministic");

            // zero the n-th row
            let start      = (n-1)*num_qubits, col =  0;
            const end      = start + num_qubits;
            let word_start = (-(-start>>Tableau.WORD) << Tableau.WORD);
            const word_end = ((end >> Tableau.WORD) << Tableau.WORD);
            const step     = (1 << Tableau.WORD);

            if (word_start >= end) word_start = end;

            // bit wise 
            while (start < word_start) {
                this.setbitx(n-1, col, 0);
                this.setbitz(n-1, col, 0);
                start++, col++;
            }
            // word wise 
            while (start < word_end) {
                this.datax[start>>>Tableau.WORD] = 0;
                this.dataz[start>>>Tableau.WORD] = 0;
                start+= step, col+= step;
            }
            // bit wise any of the reamining
            while (start < end) {
                this.setbitx(n-1, col, 0);
                this.setbitz(n-1, col, 0);
                start++, col++;
            }
            this.setbitr(n-1, 0);

            for (let i = 0; i < num_qubits; i++) {
                if (this.getbitx(i, a) !== 1) continue;
                this.rowsum(n-1, i+num_qubits);
            }

            measurment = this.getbitr(n-1);
        }

        return measurment;
    }
}


export {Tableau};
