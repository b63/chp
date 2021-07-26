'use strict';
const _WORD = 5;
const _MASK = (1 << _WORD)-1;

const PAULI_PROD = [
    // bit format: x1 z1 x2 z2
           0,    // II
           0,    // IZ
           0,    // IX
           0,    // IY
           0,    // ZI
           0,    // ZZ
           1,    // ZX
           3,    // ZY
           0,    // XI
           3,    // XZ
           0,    // XX
           1,    // XY
           0,    // YI
           1,    // YZ
           3,    // YX
           0,    // YY
        ];
const SYMBOLS_I = ['+', 'i', '-', '-i'];

class Tableau {
    static WORD = _WORD;

    static g_exp = Int8Array.from([
        // bit format: x_1 z_1 x_2 z_2
        0,  0,  0,  0, // x1 = 0, z1 = 0 
        0,  0,  1, -1, // x1 = 0, z1 = 1
        0, -1,  0,  1, // x1 = 1, z1 = 0
        0,  1, -1,  0  // x1 = 1, z1 = 1
    ]);


    constructor(n) {
        this.num_qubits = n;
        this.bits = (2*n+1)*n;

        const words_row = -(-n >> _WORD);
        this.words_row  =  words_row;

        this.bufx  = new ArrayBuffer(words_row * (2*n+1) << _WORD);
        this.bufz  = new ArrayBuffer(words_row * (2*n+1) << _WORD);
        this.bufr  = new ArrayBuffer(-(-2*(2*n+1) >> _WORD) <<_WORD);

        this.datax = new Uint32Array(this.bufx);
        this.dataz = new Uint32Array(this.bufz);
        this.datar = new Uint32Array(this.bufr);
    }

    /** GET/SET for x **/
    getbitx(row, col) {
        const idx    = row * this.words_row + (col >>> _WORD);
        const offset = (col &  _MASK);
        const u     = this.datax[idx];

        return (u & (1 << offset)) >>> offset;
    }

    setbitx(row, col, val) {
        const idx    = row * this.words_row + (col >>> _WORD);
        const offset = (col &  _MASK);
        const u     = this.datax[idx];

        // !!! & has lower precedence than ===
        if ((val & 1) === 0) {
            this.datax[idx] &= ~(1 << offset);
        } else {
            this.datax[idx] |=  (1 << offset);
        }

        return (u & (1 << offset)) >>> offset;
    }

    /** GET/SET for z **/
    getbitz(row, col) {
        const idx    = row * this.words_row + (col >>> _WORD);
        const offset = (col &  _MASK);
        const u     = this.dataz[idx];

        return (u & (1 << offset)) >>> offset;
    }

    setbitz(row, col, val) {
        const idx    = row * this.words_row + (col >>> _WORD);
        const offset = (col &  _MASK);
        const u     = this.dataz[idx];

        // !!! & has lower precedence than ===
        if ((val & 1) === 0) {
            this.dataz[idx] &= ~(1 << offset);
        } else {
            this.dataz[idx] |=  (1 << offset);
        }

        return (u & (1 << offset)) >>> offset;
    }

    /** GET/SET for r **/
    getbitr(row) {
        const idx    = row >>> (_WORD-1);
        const offset = (row << 1) & _MASK;
        const u      = this.datar[idx];

        return (u & (3 << offset)) >>> offset;
    }

    setbitr(row, val) {
        const idx    = row >>> (_WORD-1);
        const offset = (row << 1) & _MASK;
        const u      = this.datar[idx];

        this.datar[idx] = (u & ~(3 << offset)) | ((val & 3) << offset);

        return (u & (3 << offset)) >>> offset;
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
            this.setbitr(i, (ri + 2*(xia*zib * (xib ^ zia ^ 1))) & 3 );
        }
    }

    h(a) {
        console.log(`h ${a}`);
        const n = this.num_qubits;
        const N = 2*n+1;

        for (let i = 0; i < N; i++) {
            const xia = this.getbitx(i, a);
            const zia = this.getbitz(i, a);
            const ri  = this.getbitr(i);

            // add two to factor of i if gate is Y
            if ((xia & zia) === 1)
                this.setbitr(i, (ri + 2)&3 );
            // swap xia and zia
            this.setbitx(i, a, zia);
            this.setbitz(i, a, xia);
        }
    }

    p(a) {
        console.log(`p ${a}`);
        const n = this.num_qubits;
        const N = 2*n+1;

        for (let i = 0; i < N-1; i++) {
            const xia = this.getbitx(i, a);
            const zia = this.getbitz(i, a);
            const ri  = this.getbitr(i);

            // add two if gate is Y
            if ((xia & zia) === 1)
                this.setbitr(i, (ri + 2)&3 );
            this.setbitz(i, a, zia ^ xia);
        }
    }

    generators() {
        const num_qubits = this.num_qubits;
        let arr = new Array(num_qubits);

        for (let i = 0; i < 2*num_qubits; i++) {
            let gate = this.getbitr(i) === 2 ? '-' : '+';
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

    powi(i, j) {
        const n = this.num_qubits;

        let exp = this.getbitr(i) + this.getbitr(j);
        for (let k = 0; k < n; k++) {
            const gi = (this.getbitx(i, k) << 1) | this.getbitz(i, k);
            const gj = (this.getbitx(j, k) << 1) | this.getbitz(j, k);
            const g  =  (gi << 2) | gj;

            exp = (exp + PAULI_PROD[g]) & 3;
        }

        return exp;
    }

    // left-multiply row i by row i
    // row i = ()row j)(row i)
    mult_row(i, j) {
        const words_row = this.words_row;
        let i_idx      = i*words_row;
        let j_idx      = j*words_row;

        this.setbitr(i, this.powi(j, i));
        for (let k = 0; k < words_row; k++, i_idx++, j_idx++) {
            this.datax[i_idx] ^= this.datax[j_idx];
            this.dataz[i_idx] ^= this.dataz[j_idx];
        }
    }



    copy_row(i, j) {
        const words_row = this.words_row;
        let i_idx      = i*words_row;
        let j_idx      = j*words_row;

        // copy over x's and z's from row i to row j
        for (let k = 0; k < words_row; k++, i_idx++, j_idx++) {
            this.datax[j_idx] = this.datax[i_idx];
            this.dataz[j_idx] = this.dataz[i_idx];
        }

        // copy over r_j to r_i
        this.setbitr(j, this.getbitr(i));
    }


    swap_row(i, j) {
        const words_row = this.words_row;
        let i_idx      = i*words_row;
        let j_idx      = j*words_row;

        for (let k = 0; k < words_row; k++, i_idx++, j_idx++) {
            let temp = this.datax[j_idx];
            this.datax[j_idx] = this.datax[i_idx];
            this.datax[i_idx] = temp;

            temp = this.dataz[j_idx];
            this.dataz[j_idx] = this.dataz[i_idx];
            this.dataz[i_idx] = temp;
        }

        // swap r_j and r_i
        let r = this.getbitr(j);
        this.setbitr(j, this.getbitr(i));
        this.setbitr(i, r);
    }

    zero_row(i) {
        const words_row = this.words_row;
        let i_idx = i*words_row;

        for(let k = 0; k < words_row; k++, i_idx++) {
            this.datax[i_idx] = 0;
        }

        this.setbitr(i, 0);
    }

    seed(rank) {
        const n = this.num_qubits;
        this.zero_row(2*n);

        let min = 0;
        for (let i = 2*n-1; i >= n + rank; i--) {

            let e = this.getbitr(i);
            // find left-most column with Z in i-th row
            for (let j = n-1; j >= 0; j--) {

                if (this.getbitz(i, j) === 1) {
                    min = j;
                    if (this.getbitx(2*n, j) === 1)
                        e = (e+2)&3;

                }
            }

            // update seed
            if (e === 2)
                this.setbitx(2*n,min, this.getbitx(2*n,min) ^ 1);
        }
    }


    gaussian() {
        const n = this.num_qubits;

        let i    = n;
        for (let j = 0; j < n; j++) {
            // find row with X in the j-th column starting from i-th row
            let k = i;
            for (; k < 2*n; k++) {
                if (this.getbitx(k, j) === 1)
                    break;
            }

            if (k < 2*n) {
                this.swap_row(i, k);
                this.swap_row(i-n, k-n);

                for(let q = i+1; q < 2*n; q++) {
                    if (this.getbitx(q, j) === 1) {
                        this.mult_row(q, i);
                        this.mult_row(i-n, q-n);
                    }
                }
                i++;
            }
        }

        let rank = i - n;

        for (let j = 0; j < n; j++) {
            // find row with Z in the j-th column starting from i-th row
            let k = i;
            for (; k < 2*n; k++) {
                if (this.getbitz(k, j) === 1)
                    break;
            }

            if (k < 2*n) {
                this.swap_row(i, k);
                this.swap_row(i-n, k-n);

                for (let q = i+1; q < 2*n; q++) {
                    if (this.getbitz(q, j) === 1) {
                        this.mult_row(q, i);
                        this.mult_row(i-n, q-n);
                    }
                }
                i++;
            }
        }

        console.log(rank);
        return rank;
    }

    static print_ket(ket_state, n) {
        const len = ket_state.length;
        const symbols = [' +', ' i', ' -', '-i'];

        for (let i = 0; i < len; i++) {
            const s = ket_state[i];
            const str = s.state.toString(2).padStart(n, '0');
            console.log(`${symbols[s.factor]}|${str}〉\n`);
        }
    }

    get_basis_state() {
        const n = this.num_qubits;
        let exp = this.getbitr(2*n);

        let s = BigInt(0);
        for (let j = n-1; j >= 0; j--) {
            // count number of Y operators in pauli gate in scratch row
            if (this.getbitx(2*n, j) === 1 && this.getbitz(2*n, j) === 1)
                exp = (exp+1) & 3;
            // counts bits in basis state
            s = (s << 1n) | BigInt(this.getbitx(2*n, j) === 1 ? 1 : 0);
        }

        return {state: s, factor: exp};
    }

    ket_form() {
        const n     = this.num_qubits;
        const rank  = this.gaussian();
        const total =  (1 << rank);


        this.seed(rank);

        let full_state = new Array(total);
        full_state[total-1] = this.get_basis_state();

        for (let k = 0; k < total-1; k++) {
            let h = k ^ (k+1);

            for (let i = 0; i < rank; i++) {
                if (h & (1 << i) !== 0)
                    this.mult_row(2*n, n+i);
            }

            full_state[k] = this.get_basis_state();
        }

        return full_state;
    }


    measure(a) {
        const n = this.num_qubits;
        const N          = 2*n+1;
        let measurment   =  0;

        if (a >= n) {
            throw new Error(`qubit must be between 0 and ${n-1}`);
        }

        // check for destabilizer with xpa = 1
        let p = -1;
        for (let i = 0; i < n; i++) {
            if (this.getbitx(i+n, a) === 1) {
                p = i+n;
                break;
            }
        }

        if (p >= 0) {
            // outcome is probabilistic
            console.log("probabilistic");
            for (let i = 0; i < N-1; i++) {
                if (i === p || this.getbitx(i, a) !== 1) continue;
                this.rowsum(i, p);
            }

            // copy p-th row over to (p-n)-th row
            this.copy_row(p, p-n);
            this.zero_row(p);

            measurment = Math.random() < 0.5 ? 0 : 1;
            this.setbitr(p, 2*measurment);
            this.setbitz(p, a, 1);
        } else {
            // outcome is determinate
            console.log("deterministic");
            // find generator with xpa = 1
            for (p = 0; p < n; p++) {
                if (this.getbitx(p, a) === 1)
                    break;
            }
            // copy  row into scratch row
            this.copy_row(p+n, 2*n);
            for (let i = p+1; i < n; i++) {
                if (this.getbitx(i, a) === 1)
                    this.mult_row(2*n, i+n);
            }

            measurment = this.getbitr(2*n) === 0 ? 0 : 1;
        }

        return measurment;
    }
}


export {Tableau};
