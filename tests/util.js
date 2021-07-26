'use strict';

// generate the stabilizer and destabilizer for |0..0>
const gen_identity = function (n) {
    let gens = new Array(2*n);

    for (let i = 0; i < n; i++) {
        let gsx = new Array(n+1);
        let gsz = new Array(n+1);
        for (let j = 0; j < n; j++) {
            gsx[j] = 'I';
            gsz[j] = 'I';
        }
        gsx[n] = '+';
        gsz[n] = '+';
        gsx[i] = 'X';
        gsz[i] = 'Z';

        gens[i]   = gsx;
        gens[i+n] = gsz;
    }

    return gens;
}

// deep copy the array of generators
const gen_copy = function(gens) {
    const len    = gens.length/2;
    let gens_cpy = new Array(len);

    for(let i = 0; i < len; i++) {
        gens_cpy[i] = [].concat(gens[i]);
    }

    return gens_cpy;
}

// return an array of generators as strings (by joining)
const gen_str = function(gens) {
    const N      = gens.length;
    const n      = gens.length/2;

    let gens_cpy = gen_copy(gens);

    for (let i = 0; i < N; i++) {
        gens_cpy[i] = gens[i][n] + gens[i].slice(0, -1).join('');
    }

    return gens_cpy;
}

// return generator for state achieved by applying hadamard to
// specified qubits from |0...0> state
const gen_hadamard = function (n, qubits) {
    let gens = gen_identity(n);

    for (let i of qubits) {
        gens[i][i] = 'Z';
        gens[i+n][i] = 'X';
    }

    return gens;
}

// return generators for state achieved by applying cnot to
// specified qubits from |0...0> state
const gen_cnot = function (n, controls, targets) {
    let gens = gen_identity(n);
    if (controls.length !== targets.length) {
        throw new Error("different number of controls and target qubits");
        return;
    }

    const N = controls.length;
    for (let i = 0; i < N; i++) {
        const c = controls[i];
        const t = targets[i];
        gens[c][t] = 'X';
        gens[t+n][c] = 'Z';
    }

    return gens;
}

const state_compareFunction = (a, b) => {
    return a.state - b.state;
};

const state_compareFunction_bigint = (a, b) => {
    if (b.state < a.state) {
        return -1;
    } else if (a.state < b.state) {
        return 1;
    }
    return 0;
};
const ket_str = function(ket_state) {
    const len = ket_state.length;
    for (let k = 0; k < len; k++) {
        ket_state[k].state = ket_state[k].state.toString(10);
    }

    return ket_state;
}

const check_ket_repr = function(tab, assert, res_ket, instrs, res_gen) {
    const n   = tab.num_qubits;
    const len = res_ket.length;
    if (res_ket.length !== instrs.length )
        throw new Error("results ket and instructions array length mismatch");
    if (res_gen !== null && res_gen !== undefined && res_gen.length !== len)
        throw new Error("results gen and instructions array length mismatch");

    for (let k = 0; k < len; k++) {
        let r = instrs[k].f.apply(tab, instrs[k].args);
        let ket_state = tab.ket_form();

        if ( n > 31 ) {
            assert.deepEqual(ket_str(ket_state.sort(state_compareFunction_bigint)), 
                             ket_str(res_ket[k].sort(state_compareFunction_bigint))
            );
        } else {
            assert.deepEqual(ket_state.sort(state_compareFunction), 
                            res_ket[k].sort(state_compareFunction));
        }


        if (res_gen !== null && res_gen !== undefined) {
            let gen = tab.generators();
            assert.deepEqual(gen, res_gen[k]);
        }

    }
}


export {gen_identity, gen_copy, gen_str, gen_hadamard, gen_cnot};
export {state_compareFunction, state_compareFunction_bigint, ket_str, check_ket_repr};
