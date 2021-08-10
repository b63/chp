'use strict';
import  {Tableau} from '/tableau.js';

class TableauSimulator {
    constructor(prog, options) {
        this.prog   = prog;

        this.results = {};
        this.qubits  = options.qubits;
        this.regnum  = options.registers;
        this.shots   = options.shots;
        this.count   = 0; // shot counter
        this.icount  = 0; // instruction counter
        this.diffnum = 0; // number of different measurment results
        this.tab     = new Tableau(this.qubits);
        this.reg     = new Array(this.regnum);
    }

    run() {
        // do a complete run (execute all instructions)
        const len = this.prog.length;
        let i = this.icount;
        for (; i < len; i++) {
            this.step_instr();
        }
    }

    get_ket() {
        if (this.tab === null || this.tab === undefined) {
            return [];
        }

        const ket_state = this.tab.ket_form();
        const len = ket_state.length;
        const formatted = new Array(len);

        for(let i = 0; i < len; i++) {
            const item = ket_state[i];
            const bitstr = item.state.toString(2).padStart(this.qubits, '0');
            let coeftop = '1', coefbot = `\\sqrt{${len}}`;
            switch (item.factor) {
                case 1:
                    coeftop = 'i';
                    break;
                case 2:
                    coeftop = '-1';
                    break;
                case 3:
                    coeftop = '-i';
                    break;
            }
            formatted[i] = {basis: bitstr, coeftop: coeftop, coefbot: coefbot};
        }

        return formatted;
    }

    get_generators(fold, stab) {
        if (this.tab === null || this.tab === undefined) {
            return [];
        }
        if (fold !== false) {
            fold = true;
        }
        if (stab !== false) {
            fold = true;
        }

        const arr = this.tab.get_generators(fold, stab);
        const len = arr.length;
        const formatted = new Array(len);

        for (let i = 0; i < len; i++){
            let str_gates = arr[i].factor;
            const gates = arr[i].gates;
            const clen = gates.length;

            if (!fold) {
                for(let j = 0; j < clen; j++)
                    str_gates += gates[j][0].repeat(gates[j][1]);
            } else {
                for(let j = 0; j < clen; j++) {
                    if (gates[j][1] === 1)
                        str_gates += `${gates[j][0]}`;
                    else
                        str_gates += `${gates[j][0]}^{${gates[j][1]}}`;
                }
            }

            formatted[i] = str_gates;
        }

        console.log(formatted)
        return formatted;
    }

    step() {
        this.step_instr();
    }

    step_instr() {
        // execute one instruction
        const prog = this.prog;
        const tab  = this.tab;
        const reg  = this.reg;

        const icount = this.icount;
        if (icount === 0) {
            tab.initialize();
            reg.fill('0', 0);

        }

        const instr = prog[icount].f;
        const args  = prog[icount].args;

        if (instr === tab.measure) {
            const r = instr.apply(tab, [args[0]]);
            reg[this.regnum - args[1] - 1] = (r === 1 ? '1' : '0');
        } else {
            instr.apply(tab, args);
        }

        if (icount + 1 === prog.length) {
            const bitstr = reg.join('');
            const prev = this.results[bitstr];

            if (prev === undefined) {
                this.diffnum++;
                this.results[bitstr] =  1;
            } else {
                this.results[bitstr]++;
            }

            this.count++;
            this.icount = 0;
        } else {
            this.icount = icount + 1;
        }
    }

    done() {
        return (this.count >= this.shots);
    }

    get_results() {
        const len = this.diffnum;
        let lines = new Array(len);

        let i = 0;
        for (let bitstr in this.results) {
            lines[i] = [bitstr, this.results[bitstr]/this.count,
                        this.results[bitstr]];
            i++;
        }

        return lines;
    }


    static parse_prog(prog, qubits, registers) {
        // to access member functions
        const _Tableau = new Tableau(1);

        const len = prog.length;
        let instrs = new Array(len);

        for (let i = 0; i < len; i++) {
            const cmd = prog[i];
            const args = cmd.args;

            switch (cmd.instr) {
                case 'cnot':
                    if (!TableauSimulator.valid_uint(args[0], qubits))
                        return TableauSimulator.fmt_error(cmd.source, `unkown qubit '${args[0]}'`);
                    if (!TableauSimulator.valid_uint(args[1], qubits))
                        return TableauSimulator.fmt_error(cmd.source, `unkown qubit '${args[1]}'`);
                    if (args.length !== 2)
                        return TableauSimulator.fmt_error(cmd.source, 'cnot takes two parameters');
                    instrs[i] = {f: _Tableau.cnot, args: [Number(args[0]), Number(args[1])]};
                    break;

                case 'phase':
                    if (!TableauSimulator.valid_uint(args[0], qubits))
                        return TableauSimulator.fmt_error(cmd.source, `unkown qubit '${args[0]}'`);
                    if (args.length !== 1)
                        return TableauSimulator.fmt_error(cmd.source, 'phase takes one parameters');
                    instrs[i] = {f: _Tableau.p, args: [Number(args[0])]};
                    break;

                case 'hadamard':
                    if (!TableauSimulator.valid_uint(args[0], qubits))
                        return TableauSimulator.fmt_error(cmd.source, `unkown qubit '${args[0]}'`);
                    if (args.length !== 1)
                        return TableauSimulator.fmt_error(cmd.source, 'hadamard takes one parameters');
                    instrs[i] = {f: _Tableau.h, args: [Number(args[0])]};
                    break;

                case 'measure':
                    if (!TableauSimulator.valid_uint(args[0], registers))
                        return TableauSimulator.fmt_error(cmd.source, `unkown register '${args[0]}'`);
                    if (!TableauSimulator.valid_uint(args[1], registers))
                        return TableauSimulator.fmt_error(cmd.source, `unkown register '${args[1]}'`);
                    if (args.length !== 2)
                        return TableauSimulator.fmt_error(cmd.source, 'measure takes two parameters');
                    instrs[i] = {f: _Tableau.measure, args: [Number(args[0]), Number(args[1])]};
                    break;

                default:
                    return TableauSimulator.fmt_error(cmd.source, `instruction ${i+1}, unkown command '${cmd.instr}'`);
            }
        }
        
        return {
            error: false,
            data: instrs
        };
    }

    static fmt_error(line, reason) {
        return {
            error: true,
            data: `line ${line}: ${reason}`
        };
    }

    static valid_uint(token, max) {
        const n = Number(token);
        if (!Number.isInteger(n))
            return false;
        return n >= 0 && n < max;
    }
}

export {TableauSimulator};

