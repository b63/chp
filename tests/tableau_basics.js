import {Tableau} from '/tableau.js';

'use strict';
const {test} = QUnit;

QUnit.module("Tableau basics");

// verify that the n-qubit tablaeu is that of the |0...0> state
// does not check the 'scratch row' (2n+1)-th row
const check_identity = function(n, tab, assert) {
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            // top half
            // check xij
            if (i === j) {
                assert.equal(tab.getbitx(i, j), 1);
            } else {
                assert.equal(tab.getbitx(i, j), 0);
            }

            // check zij
            assert.equal(tab.getbitz(i, j), 0);

            // bottom half
            // check xij
            if (i === j) {
                assert.equal(tab.getbitz(i+n, j), 1);
            } else {
                assert.equal(tab.getbitz(i+n, j), 0);
            }

            // check zij
            assert.equal(tab.getbitx(i+n, j), 0);
        }
    }
};

test("initialize with identity, n = 2", assert => {
    const n = 2;
    const tab = new Tableau(n);
    tab.initialize();
    check_identity(n, tab, assert);
});

test("initialize with identity, n = 5", assert => {
    const n = 5;
    const tab = new Tableau(n);
    tab.initialize();
    check_identity(n, tab, assert);
});

test("initialize with identity, n = 32", assert => {
    const n = 32;
    const tab = new Tableau(n);
    tab.initialize();
    check_identity(n, tab, assert);
});



const check_setgetbitxz = function(n, tab, assert, z) {
    const total_bits = (2*n+1)*n;
    const num_bytes = (-(-total_bits  >> 3) << 3);
    const bits = new Uint8Array(num_bytes);

    const get_bit = function (i) {
        const u8 = bits[i>>>3];
        const offset = (i & 7);
        return (u8 & (1 << offset) ) >>> offset;
    };

    const setbitxz = (z === true ? tab.setbitz: tab.setbitx);
    const getbitxz = (z === true ? tab.getbitz: tab.getbitx);

    // generate random bytes
    for (let i = 0; i < num_bytes; i++ )
        bits[i] = Math.floor((Math.random() * 256));

    // set xij to random bits
    for (let i = 0; i < 2*n+1; i++) {
        for (let j = 0; j < n; j++) {
            setbitxz.call(tab, i, j, get_bit(i*n+j));
        }
    }

    // check that bits were set correctly
    for (let i = 0; i < 2*n+1; i++) {
        for (let j = 0; j < n; j++) {
            assert.equal(getbitxz.call(tab, i, j), get_bit(i*n+j) );
        }
    }
};

test("setbitxz/getbitxz, n = 2", assert => {
    const n = 2;
    const tab = new Tableau(n);
    check_setgetbitxz(n, tab, assert, false);
    check_setgetbitxz(n, tab, assert, true);
});

test("setbitxz/getbitxz, n = 32", assert => {
    const n = 32;
    const tab = new Tableau(n);
    // test x's
    check_setgetbitxz(n, tab, assert, false);
    // test z's
    check_setgetbitxz(n, tab, assert, true);
});

test("setbitxz/getbitxz, n = 40", assert => {
    const n = 40;
    const tab = new Tableau(n);
    // test x's
    check_setgetbitxz(n, tab, assert, false);
    // test z's
    check_setgetbitxz(n, tab, assert, true);
});


const check_setgetbitr = function(n, tab, assert) {
    const total_bits = (2*n+1);
    const num_bytes = (-(-total_bits  >> 3) << 3);
    const bits = new Uint8Array(num_bytes);

    const get_bit = function (i) {
        const u8 = bits[i>>>3];
        const offset = (i & 7);
        return (u8 & (1 << offset) ) >>> offset;
    };

    const setbitr = tab.setbitr;
    const getbitr = tab.getbitr;

    // generate random bytes
    for (let i = 0; i < num_bytes; i++ )
        bits[i] = Math.floor((Math.random() * 256));

    // set r_i to random bits
    for (let i = 0; i < 2*n+1; i++) {
        setbitr.call(tab, i, get_bit(i));
    }

    // check that bits were set correctly
    for (let i = 0; i < 2*n+1; i++) {
        assert.equal(getbitr.call(tab, i), get_bit(i) );
    }
};
test("setbitr/getbitr, n = 2", assert => {
    const n = 2;
    const tab = new Tableau(n);
    check_setgetbitr(n, tab, assert);
});

test("setbitr/getbitr, n = 32", assert => {
    const n = 32;
    const tab = new Tableau(n);
    check_setgetbitr(n, tab, assert);
});

test("setbitr/getbitr, n = 40", assert => {
    const n = 40;
    const tab = new Tableau(n);
    check_setgetbitr(n, tab, assert);
});
