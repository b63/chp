import {Tableau} from '/tableau.js';
import {state_compareFunction, state_compareFunction_bigint, 
        ket_str, check_ket_repr}
    from '/tests/util.js';

'use strict';

const {test} = QUnit;

QUnit.module("Basic Algorithms");

test("quantum teleportation, n = 5", assert => {
    const n = 5;
    // m 0 -> 0, m 1 -> 0
    const res_ket00 = [
        // h 1
        [{state: 0, factor: 0}, {state: 2, factor: 0}, ],
        // cnot 1, 2
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // cnot 0, 1
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // h 0
        [{state: 0, factor: 0}, {state: 1, factor: 0}, {state: 6, factor: 0}, {state: 7, factor: 0}, ],
        // m 0; 0 (probabilistic)
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // m 1; 0 (probabilistic)
        [{state: 0, factor: 0}, ],
        // cnot 0, 3
        [{state: 0, factor: 0}, ],
        // cnot 1, 3
        [{state: 0, factor: 0}, ],
        // cnot 4, 2
        [{state: 0, factor: 0}, ],
        // h 2
        [{state: 0, factor: 0}, {state: 4, factor: 0}, ],
        // cnot 3, 2
        [{state: 0, factor: 0}, {state: 4, factor: 0}, ],
        // h 2
        [{state: 0, factor: 0}, ],
    ];
    const res_gen00 = [
        // h 1
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXIII", "+ZIIII", "+IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 1, 2
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // cnot 0, 1
        ["+ZZIII", "+XXXII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // h 0
        ["+ZXXII", "+XZIII", "+IIXII", "+IIIXI", "+IIIIX", "+XIIII", "+IXXII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // m 0
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // m 1
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "+ZIIII", "+IZIII", "+IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 0, 3
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "+ZIIII", "+IZIII", "+IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 1, 3
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "+ZIIII", "+IZIII", "+IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 4, 2
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIXIX", "+ZIIII", "+IZIII", "+IIZIZ", "+IIIZI", "+IIIIZ"],
        // h 2
        ["+IIZII", "+XIIII", "+IXIII", "+IIIXI", "+IIZIX", "+IIXIZ", "+ZIIII", "+IZIII", "+IIIZI", "+IIIIZ"],
        // cnot 3, 2
        ["+IIZZI", "+XIIII", "+IXIII", "+IIXXI", "+IIZZX", "+IIXIZ", "+ZIIII", "+IZIII", "+IIIZI", "+IIIIZ"],
        // h 2
        ["+XIIII", "+IXIII", "+IIXZI", "+IIZXI", "+IIXZX", "+ZIIII", "+IZIII", "+IIZIZ", "+IIIZI", "+IIIIZ"],
    ];

    // m 0 -> 0, m 1 -> 1
    const res_ket01 = [
        // h 1
        [{state: 0, factor: 0}, {state: 2, factor: 0}, ],
        // cnot 1, 2
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // cnot 0, 1
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // h 0
        [{state: 0, factor: 0}, {state: 1, factor: 0}, {state: 6, factor: 0}, {state: 7, factor: 0}, ],
        // m 0; 0 (probabilistic)
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // m 1; 1 (probabilistic)
        [{state: 6, factor: 0}, ],
        // cnot 0, 3
        [{state: 6, factor: 0}, ],
        // cnot 1, 4
        [{state: 22, factor: 0}, ],
        // cnot 4, 2
        [{state: 18, factor: 0}, ],
        // h 2
        [{state: 18, factor: 0}, {state: 22, factor: 0}, ],
        // cnot 3, 2
        [{state: 18, factor: 0}, {state: 22, factor: 0}, ],
        // h 2
        [{state: 18, factor: 0}, ],
    ];
    const res_gen01 = [
        // h 1
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXIII", "+ZIIII", "+IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 1, 2
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // cnot 0, 1
        ["+ZZIII", "+XXXII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // h 0
        ["+ZXXII", "+XZIII", "+IIXII", "+IIIXI", "+IIIIX", "+XIIII", "+IXXII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // m 0
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // m 1
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "+ZIIII", "-IZIII", "-IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 0, 3
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "+ZIIII", "-IZIII", "-IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 1, 4
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "+ZIIII", "-IZIII", "-IIZII", "+IIIZI", "-IIIIZ"],
        // cnot 4, 2
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIXIX", "+ZIIII", "-IZIII", "-IIZIZ", "+IIIZI", "-IIIIZ"],
        // h 2
        ["+IIZII", "+XIIII", "+IXIII", "+IIIXI", "+IIZIX", "-IIXIZ", "+ZIIII", "-IZIII", "+IIIZI", "-IIIIZ"],
        // cnot 3, 2
        ["+IIZZI", "+XIIII", "+IXIII", "+IIXXI", "+IIZZX", "-IIXIZ", "+ZIIII", "-IZIII", "+IIIZI", "-IIIIZ"],
        // h 2
        ["+XIIII", "+IXIII", "+IIXZI", "+IIZXI", "+IIXZX", "+ZIIII", "-IZIII", "-IIZIZ", "+IIIZI", "-IIIIZ"],
    ];

    // m 0 -> 1, m 1 -> 0
    const res_ket10 = [
        // h 1
        [{state: 0, factor: 0}, {state: 2, factor: 0}, ],
        // cnot 1, 2
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // cnot 0, 1
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // h 0
        [{state: 0, factor: 0}, {state: 1, factor: 0}, {state: 6, factor: 0}, {state: 7, factor: 0}, ],
        // m 0; 1 (probabilistic)
        [{state: 1, factor: 0}, {state: 7, factor: 0}, ],
        // m 1; 0 (probabilistic)
        [{state: 1, factor: 0}, ],
        // cnot 0, 3
        [{state: 9, factor: 0}, ],
        // cnot 1, 4
        [{state: 9, factor: 0}, ],
        // cnot 4, 2
        [{state: 9, factor: 0}, ],
        // h 2
        [{state: 9, factor: 0}, {state: 13, factor: 0}, ],
        // cnot 3, 2
        [{state: 9, factor: 0}, {state: 13, factor: 0}, ],
        // h 2
        [{state: 9, factor: 0}, ],
    ];
    const res_gen10 = [
        // h 1
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXIII", "+ZIIII", "+IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 1, 2
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // cnot 0, 1
        ["+ZZIII", "+XXXII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // h 0
        ["+ZXXII", "+XZIII", "+IIXII", "+IIIXI", "+IIIIX", "+XIIII", "+IXXII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // m 0
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "-ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // m 1
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "-ZIIII", "+IZIII", "+IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 0, 3
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "-ZIIII", "+IZIII", "+IIZII", "-IIIZI", "+IIIIZ"],
        // cnot 1, 4
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "-ZIIII", "+IZIII", "+IIZII", "-IIIZI", "+IIIIZ"],
        // cnot 4, 2
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIXIX", "-ZIIII", "+IZIII", "+IIZIZ", "-IIIZI", "+IIIIZ"],
        // h 2
        ["+IIZII", "+XIIII", "+IXIII", "+IIIXI", "+IIZIX", "+IIXIZ", "-ZIIII", "+IZIII", "-IIIZI", "+IIIIZ"],
        // cnot 3, 2
        ["+IIZZI", "+XIIII", "+IXIII", "+IIXXI", "+IIZZX", "+IIXIZ", "-ZIIII", "+IZIII", "-IIIZI", "+IIIIZ"],
        // h 2
        ["+XIIII", "+IXIII", "+IIXZI", "+IIZXI", "+IIXZX", "-ZIIII", "+IZIII", "+IIZIZ", "-IIIZI", "+IIIIZ"],
    ];

    // m 0 -> 1, m 1 -> 1
    const res_ket11 = [
        // h 1
        [{state: 0, factor: 0}, {state: 2, factor: 0}, ],
        // cnot 1, 2
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // cnot 0, 1
        [{state: 0, factor: 0}, {state: 6, factor: 0}, ],
        // h 0
        [{state: 0, factor: 0}, {state: 1, factor: 0}, {state: 6, factor: 0}, {state: 7, factor: 0}, ],
        // m 0; 1 (probabilistic)
        [{state: 1, factor: 0}, {state: 7, factor: 0}, ],
        // m 1; 1 (probabilistic)
        [{state: 7, factor: 0}, ],
        // cnot 0, 3
        [{state: 15, factor: 0}, ],
        // cnot 1, 4
        [{state: 31, factor: 0}, ],
        // cnot 4, 2
        [{state: 27, factor: 0}, ],
        // h 2
        [{state: 27, factor: 0}, {state: 31, factor: 0}, ],
        // cnot 3, 2
        [{state: 27, factor: 0}, {state: 31, factor: 0}, ],
        // h 2
        [{state: 27, factor: 0}, ],
    ];
    const res_gen11 = [
        // h 1
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXIII", "+ZIIII", "+IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 1, 2
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // cnot 0, 1
        ["+ZZIII", "+XXXII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "+ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // h 0
        ["+ZXXII", "+XZIII", "+IIXII", "+IIIXI", "+IIIIX", "+XIIII", "+IXXII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // m 0
        ["+IZIII", "+XIIII", "+IIXII", "+IIIXI", "+IIIIX", "+IXXII", "-ZIIII", "+IZZII", "+IIIZI", "+IIIIZ"],
        // m 1
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "-ZIIII", "-IZIII", "-IIZII", "+IIIZI", "+IIIIZ"],
        // cnot 0, 3
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "-ZIIII", "-IZIII", "-IIZII", "-IIIZI", "+IIIIZ"],
        // cnot 1, 4
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIIIX", "-ZIIII", "-IZIII", "-IIZII", "-IIIZI", "-IIIIZ"],
        // cnot 4, 2
        ["+XIIII", "+IXIII", "+IIXII", "+IIIXI", "+IIXIX", "-ZIIII", "-IZIII", "-IIZIZ", "-IIIZI", "-IIIIZ"],
        // h 2
        ["+IIZII", "+XIIII", "+IXIII", "+IIIXI", "+IIZIX", "-IIXIZ", "-ZIIII", "-IZIII", "-IIIZI", "-IIIIZ"],
        // cnot 3, 2
        ["+IIZZI", "+XIIII", "+IXIII", "+IIXXI", "+IIZZX", "-IIXIZ", "-ZIIII", "-IZIII", "-IIIZI", "-IIIIZ"],
        // h 2
        ["+XIIII", "+IXIII", "+IIXZI", "+IIZXI", "+IIXZX", "-ZIIII", "-IZIII", "-IIZIZ", "-IIIZI", "-IIIIZ"],
    ];


    let tab = new Tableau(n);
    tab.initialize();

    const instrs = [
        {f: tab.h,       args: [1]},
        {f: tab.cnot,    args: [1, 2]},
        {f: tab.cnot,    args: [0, 1]},
        {f: tab.h,       args: [0]},
        {f: tab.measure, args: [0]},
        {f: tab.measure, args: [1]},
        {f: tab.cnot,    args: [0, 3]},
        {f: tab.cnot,    args: [1, 4]},
        {f: tab.cnot,    args: [4, 2]},
        {f: tab.h,       args: [2]},
        {f: tab.cnot,    args: [3, 2]},
        {f: tab.h,       args: [2]},
    ];

    const len = instrs.length;

    let ket_record  = new Array(len);
    let gen_record  = new Array(len);
    let measurments = [];

    for (let k = 0; k < len; k++) {
        let r = instrs[k].f.apply(tab, instrs[k].args);
        ket_record[k] = tab.ket_form().sort(state_compareFunction);
        gen_record[k] = tab.generators();

        if (instrs[k].f === tab.measure) {
            measurments.push(r);
        }
    }

    // check
    let m = (measurments[0] << 1) | (measurments[1]);
    for (let k = 0; k < len; k++) {
        if (m === 0) {
            assert.deepEqual(ket_record[k], res_ket00[k].sort(state_compareFunction));
            assert.deepEqual(gen_record[k], res_gen00[k]);
        } else if (m === 1) {
            assert.deepEqual(ket_record[k], res_ket01[k].sort(state_compareFunction));
            assert.deepEqual(gen_record[k], res_gen01[k]);
        } else  if (m === 2) {
            assert.deepEqual(ket_record[k], res_ket10[k].sort(state_compareFunction));
            assert.deepEqual(gen_record[k], res_gen10[k]);
        } else { // m === 3
            assert.deepEqual(ket_record[k], res_ket11[k].sort(state_compareFunction));
            assert.deepEqual(gen_record[k], res_gen11[k]);
        }
    }
});
