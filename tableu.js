'use strict';

class Tableau {
    static g_exp = Int8Array.from([
        // bit format: x_1 z_1 x_2 z_2
        0,  0,  0,  0, // x1 = 0, z1 = 0 
        0,  0,  1, -1, // x1 = 0, z1 = 1
        0, -1,  0,  1, // x1 = 1, z1 = 0
        0,  1, -1,  0  // x1 = 1, z1 = 1
    ]);

    constructor(num_qubits) {
        this.num_qubits = num_qubits;
        this.n          = 2*num_qubits+1;
        this.bytes = Math.ceil(this.n**2/8);
        this.buf = new ArrayBuffer(this.bytes);
        this.data = new Uint8Array(this.buf);
    }

    getbit(row, col) {
        let bitpos  = row * this.n + col;
        let bytepos =  Math.floor(bitpos/8);
        let offset  = bitpos % 8;
        let u8 = this.data[bytepos];

        return (u8 & (1 << offset)) >> offset;
    }

    setbit(row, col, val) {
        let bitpos  = row * this.n + col;
        let bytepos =  Math.floor(bitpos/8);
        let offset  = bitpos % 8;
        let u8 = this.data[bytepos];

        // !!! & has lower precedence than ===
        if ((val & 1) === 0) {
            this.data[bytepos] &= ~(1 << offset);
        } else {
            this.data[bytepos] |=  (1 << offset);
        }

        return (u8 & (1 << offset)) >> offset;
    }

    initialize() {
        // initialize tableau with 'identity' matrix
        const num_qubits = this.num_qubits;
        for (let i = 0; i < num_qubits; i++) {
            this.setbit(i, i, 1);
            this.setbit(i + num_qubits, i + num_qubits, 1);
        }  
    }

    print() {
        const n = this.n, num_qubits = this.num_qubits;
        let output = "";

        for (let i = 0; i < n; i++) {
            let line = "(";
            for (let j = 0; j < n; j++) {
                if (j === num_qubits || j +1 === n) {
                    line += '   │ ';
                }
                line += `${this.getbit(i, j)}`.padStart(3, ' ');
            }
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
        const n          = this.n;

        let sum = 2 * (this.getbit(h, n-1) + this.getbit(i, n-1));
        //console.log(`sum = ${sum}`);

        for (let j = 0; j < num_qubits; j++) {
            const xij = this.getbit(i, j);
            const xhj = this.getbit(h, j);
            const zij = this.getbit(i, j+num_qubits);
            const zhj = this.getbit(h, j+num_qubits);

            const xzxz = (xij << 3) | (zij << 2) | (xhj << 1) | (zhj);
            sum  += Tableau.g_exp[xzxz];
            //console.log(`${j}: g = ${Tableau.g_exp[xzxz]}`);

            this.setbit(h, j, (xij ^ xhj) & 1);
            this.setbit(h, j + num_qubits, (zij ^ zhj) & 1);
        }

        if (sum % 4 === 0) {
            this.setbit(h, n-1, 0);
        } else if ((sum % 4) === 2) {
            // sum should never be = 1,3 (mod 4)
            this.setbit(h, n-1, 1);
        }
    }

    cnot(a, b) {
        const n = this.n;
        const num_qubits = this.num_qubits;s

        for (let i = 0; i < n-1; i++) {
            const xia = this.getbit(i, a);
            const zia = this.getbit(i, a + num_qubits);
            const xib = this.getbit(i, b);
            const zib = this.getbit(i, b + num_qubits);
            const ri  = this.getbit(i, n-1);

            // xib
            this.setbit(i, b. xia ^ xib);
            // zia
            this.setbit(i, a + num_qubits. zia ^ zib);
            // ri
            this.setbit(i, n-1, ri ^ (xia*zib *(xib ^ zia ^ 1)));
        }
    }

    h(a) {
        const num_qubits = this.num_qubits;
        const n          = this.n;

        for (let i = 0; i < n; i++) {
            const xia = this.getbit(i, a);
            const zia = this.getbit(i, a + num_qubits);
            const ri  = this.getbit(i, n-1);

            this.setbit(i, n-1, ri ^ (xia * zia));
            // swap xia and zia
            this.setbit(i, a, zia);
            this.setbit(i, a + num_qubits, xia);
        }
    }

    p(a) {
        const num_qubits = this.num_qubits;
        const n          = this.n;

        for (let i = 0; i < n; i++) {
            const xia = this.getbit(i, a);
            const zia = this.getbit(i, a + num_qubits);
            const ri  = this.getbit(i, n-1);

            this.setbit(i, n-1, ri ^ (xia * zia));
            this.setbit(i, a + num_qubits, zia ^ xia);
        }
    }

    measure(a) {
        const num_qubits = this.num_qubits;
        const n          = this.n;
        let measurment   =  0;

        if (a >= num_qubits) {
            throw new Error(`qubit must be between 0 and ${num_qubits-1}`);
        }

        // check for xpa = 1
        let p = 0;
        for (let i = 0; i < num_qubits; i++) {
            if (this.getbit(i+num_qubits, a) == 1) {
                p = 1;
                break;
            }
        }

        if (p === 1) {
            // outcome is probabilistic
            console.log("probabilistic");
            for (let i = 0; i < n-1; i++) {
                if (i === p || this.getbit(i, a) === 1) continue;
                this.rowsum(i, p);
            }

            if (p !== n-p) {
                let i = p*n, j = (n-p)*n, col = 0;
                while (i < n-8) {
                    if (i%8 === 0 && j%8 === 0) {
                        this.data[j>>3] = this.data[i>>3];
                        this.data[i>>3] = 0;
                        i += 8;
                        j += 8;
                        col += 8;
                    } else {
                        this.setbit(n-p, col, this.getbit(p, col));
                        this.setbit(p, col, 0);
                        i++, j++, col++;
                    }
                }

                while (i < n) {
                    this.setbit(n-p, col, this.getbit(p, col));
                    this.setbit(p, col, 0);
                    i++, j++, col++;
                }
            }

            measurment = Math.random() < 0.5 ? 0 : 1;
            this.setbit(p, n-1, measurment);
            this.setbit(p, a + num_qubits, 1);
        } else {
            // outcome is determinate
            console.log("deterministic");

            // zero the n-th row
            let start = n*n, end = n*n + n, col = 0;
            let byte_start = -8*(-start>>3), byte_end = 8*(end>>3);
            if (byte_start >= end) byte_start = end;

            // bit wise 
            while (start < byte_start) {
                this.setbit(n, col, 0);
                start++, col++;
            }
            // byte wise 
            while (start < byte_end) {
                this.data[start>>3] = 0;
                start+=8, col+=8;
            }
            // bit wise any of the reamining
            while (start < end) {
                this.setbit(n, col, 0);
                start++, col++;
            }

            for (let i = 0; i < num_qubits; i++) {
                if (this.getbit(i, a) !== 1) continue;
                this.rowsum(n-1, i+num_qubits);
            }

            measurment = this.getbit(n-1, n-1);
        }

        return measurment;
    }
    
}
