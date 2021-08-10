//import {Tableau} from '/tableau.js';
//import {TableauSimulator} from '/TableauSimulator.js';

(async function(){
    // dynamically import scripts as modules
    const m1 = await import('/chp/tableau.js');
    const m2 = await import('/chp/TableauSimulator.js');

    const Tableau = m1.Tableau;
    const TableauSimulator = m2.TableauSimulator;

    /** GLOBALS **/
    let simulator = null;
    let current_prog = null;

    const parse_commands = function(lines) {
        const len = lines.length;

        let qprog = new Array();
        for (let i = 0; i < len; i++) {
            const line = lines[i].text.trim();
            const tokens =  line.split(/\s/).filter(x => x.length > 0);
            if (tokens.length > 0) {
                qprog.push({instr: tokens[0], args: tokens.slice(1), source: lines[i].lineno});
            }
        }

        return qprog;
    }

    self.onmessage = function(e) {
        const command = e.data.command;
        if (command === 'run' || command == 'start') {
            self.postMessage({type: "status", content: "Parsing..."});

            current_prog       = parse_commands(e.data.lines);
            const parse_result = TableauSimulator.parse_prog(current_prog,
                                e.data.qubits, e.data.registers);

            if (parse_result.error) {
                self.postMessage({
                    type: "error",
                    content: parse_result.data
                });
                return;
            } else {
                simulator = new TableauSimulator(parse_result.data, 
                        { qubits: e.data.qubits, 
                        registers: e.data.registers,
                        shots:  e.data.shots}
                    );
                console.log(e.data.qubits);
                if (command === 'start') {
                    self.postMessage({type: "status", 
                        command: "start", 
                        tokens: current_prog[simulator.icount],
                        icount: simulator.icount,
                        completed: simulator.count,
                        shots: simulator.shots
                    });
                } else {
                    self.postMessage({type: "continue?", command: command, 
                        completed: simulator.count, shots: simulator.shots});
                }
            }
        } else if (command === 'step') {
            simulator.step();
            self.postMessage({type: "status", 
                command: "step", 
                tokens: current_prog[simulator.icount],
                icount: simulator.icount,
                completed: simulator.count,
                shots: simulator.shots
            });

            if (simulator.done()) {
                self.postMessage({type: "done", command: "step", 
                    results: simulator.get_results(),
                    shots: simulator.shots
                });
            }
        } else if (command === 'resume') {
            self.postMessage({type: "continue?", command: "run", 
                completed: simulator.count, shots: simulator.shots});
        } else if (command === "continue") {
            simulator.run();

            if (simulator.done()) {
                self.postMessage({type: "done", command: "run", 
                    results: simulator.get_results(),
                    shots: simulator.shots
                });
            } else {
                self.postMessage({type: "continue?", command: "run", 
                    completed: simulator.count, 
                    shots: simulator.shots,
                    tokens: current_prog[simulator.icount],
                    icount: simulator.icount,
                });
            }
        } else if (command === 'printket') {
            const ket = simulator.get_ket();
            self.postMessage({type: 'done', command: 'printket',
                ket: ket
            });
        } else if (command === 'printstab') {
            const gens = simulator.get_generators(simulator.qubits > 5, true);
            self.postMessage({
                type: 'done', command: 'printstab',
                gens: gens
            });
        } else if (command === 'printstabanti') {
            const gens = simulator.get_generators(simulator.qubits > 5, false);
            self.postMessage({
                type: 'done', command: 'printstabanti',
                gens: gens
            });
        } else if (command === 'stop') {
            // clean up if needed
            self.postMessage({type: 'done', command: 'stop', what: e.data.what});
        } else {
            throw new Error(`unkown command '${command}'`);
        }
    };

})();
