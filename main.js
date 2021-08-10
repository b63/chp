if (!window['chp'])
    window['chp'] = {};

if (!window.chp['state'])
    window.chp['state'] = {};

if(!window.chp.state['USER_OPTIONS'])
    window.chp.state['USER_OPTIONS'] = {
        qubits: 5,
        registers: 5,
        shots: 100
    };

window.chp['main'] = (function() {

    const State  = window.chp.state;
    const Output = window.chp.output;
    const Editor = window.chp.editor;

    const options_button = document.querySelector('.settings-button');
    const settings_dropdown = document.querySelector('.settings-dropdown');

    const num_qubits_field      = document.querySelector('#num-qubits-field');
    const num_registers_field   = document.querySelector('#num-registers-field');
    const num_shots_field       = document.querySelector('#num-shots-field');
    const settings_apply_button = document.querySelector('.settings-apply-button');

    const validate_field = function(min, max, field) {
        const val = Number(field.value);
        if (Number.isInteger(val) && (min === null || val >= min)
                && (max === null || val <= max)) {
            return true;
        }
        return false;
    };

    const num_field_validator = function(e) {
        if (!validate_field(1, null, e.target)) {
            e.target.classList.add('invalid');
        } else {
            e.target.classList.remove('invalid');
        }
    };

    num_qubits_field.addEventListener('input', num_field_validator);
    num_registers_field.addEventListener('input', num_field_validator);
    num_shots_field.addEventListener('input', num_field_validator);

    settings_apply_button.addEventListener('click', function(e) {
        if (num_qubits_field.classList.contains('invalid') 
            || num_registers_field.classList.contains('invalid'))
            return;
        State.USER_OPTIONS.qubits = Number(num_qubits_field.value);
        State.USER_OPTIONS.registers = Number(num_registers_field.value);
        State.USER_OPTIONS.shots     = Number(num_shots_field.value);
        options_button.click();
    });

    options_button.addEventListener("click", function(e){
        if (options_button.classList.contains('button-active-state')) {
            settings_dropdown.classList.add('hide-dropdown');
            options_button.classList.remove('button-active-state');
            options_button.classList.add('button-inactive-state');
        } else {
            settings_dropdown.classList.remove('hide-dropdown');
            options_button.classList.remove('button-inactive-state');
            options_button.classList.add('button-active-state');

            num_qubits_field.value    = State.USER_OPTIONS.qubits;
            num_registers_field.value = State.USER_OPTIONS.registers;
            num_shots_field.value     = State.USER_OPTIONS.shots;
        }
    });


    const runstop_btn       = document.querySelector(".run-stop-button");
    const runstop_btn_label = document.querySelector(".run-stop-button span");
    const run_svg  = document.querySelector(".run-svg");
    const stop_svg = document.querySelector(".stop-svg");

    const pause_btn = document.querySelector('.pause-play-button');
    const pause_svg = document.querySelector(".pause-svg");
    const play_svg  = document.querySelector(".play-svg");
    const step_btn  = document.querySelector('.step-button');

    // state === true  -> 'paused state'
    // state === false -> 'unpaused state'
    const set_pause_btn = function(state, disabled) {
        if (disabled !== true)
            disbaled = false;

        switch (state) {
            case 'pause':
                pause_btn.disabled = disabled;
                pause_btn.classList.remove('paused-state');
                pause_btn.children[0].textContent = 'Pause';
                pause_svg.style.display = 'block';
                play_svg.style.display  = 'none';
                break;
            case 'resume':
                pause_btn.disabled = disabled;
                pause_btn.children[0].textContent = 'Resume';
                pause_btn.classList.add('paused-state');
                pause_svg.style.display = 'none';
                play_svg.style.display  = 'block';
                break;
            default:
        }
    };
    set_pause_btn('pause', true);

    // state === true  -> "run state"
    // state === false -> "stop state"
    const set_runstop_btn = function(state, disabled) {
        if (disabled !== true)
            disabled = false;

        if (state === 'run' && !runstop_btn.classList.contains('run-state')) {
            runstop_btn.classList.remove('stop-state');
            runstop_btn.classList.add('run-state');

            runstop_btn_label.textContent = "Run";
            stop_svg.style.display = "none";
            run_svg.style.display  = "block";
        } else if (state === 'stop' && !runstop_btn.classList.contains('stop-state')) {
            runstop_btn.classList.remove('run-state');
            runstop_btn.classList.add('stop-state');

            runstop_btn_label.textContent = "Stop";
            run_svg.style.display = "none";
            stop_svg.style.display = "block";
        }

        runstop_btn.disabled = disabled;
    };

    const step_btn_enabled = function(state) {
        if (state) {
            step_btn.disabled = false;
        } else {
            step_btn.disabled = true;
        }
    }

    const worker = new Worker('simulator_worker.js');
    worker.onmessage = function(e) {
        switch(e.data.type) {
            case 'status':

                if (e.data.command === 'step' || e.data.command === 'start' ) {
                    if (e.data.command === 'start') {
                        Output.add_to_output('default', {text: ''});
                    }
                    Output.add_to_output('default', {
                        text: `Instruction ${e.data.icount}\nShot: ${e.data.completed}/${e.data.shots}`
                    });

                    Output.add_to_output('source', {
                        instr: e.data.tokens.instr,
                        line:  e.data.tokens.source,
                        args: Array.from(e.data.tokens.args)
                    });
                    Output.enable_input(true);
                    State.STEPPING = false;
                } else {
                    Output.add_to_output('default', {text: e.data.content});
                }

                break;

            case 'done':
                if (e.data.command === 'run' || e.data.comand === 'step') {
                    Output.update_output_progress({
                        text: `Completed runs`,
                        progress: `${e.data.shots}`,
                        fill: 100
                    });
                    Output.add_to_output('default', {text: '\n'});
                    Output.add_to_output('results-table', {
                        results: e.data.results 
                    });

                    Output.enable_input(true);
                    set_runstop_btn('run');
                    set_pause_btn('pause', true);
                    step_btn_enabled(true);
                    State.RUNNING = false;

                } else if (e.data.command === 'stop') {
                    if (e.data.what === 'run') {
                        // stopped while running
                        Output.add_to_output('error', {text: 'Terminating...'});
                        set_runstop_btn('run');
                        set_pause_btn('pause', true);
                        step_btn_enabled(true);
                        Output.enable_input(true);
                    } else if (e.data.what === 'step') {
                        // stopped while stepping
                        State.RUNNING = false;
                        State.PAUSED = false;
                        Output.add_to_output('default', {text: 'Stopped.'});
                        set_runstop_btn('run');
                        set_pause_btn('pause', true);
                        step_btn_enabled(true);
                        Output.enable_input(true);
                    } else if (e.data.what === 'printket'){
                        Output.add_to_output('error', {text: 'Worker stopped.'});
                        // assuming commands can only run in PAUSED state
                        set_pause_btn('resume', true);
                        step_btn_enabled(true);
                        set_runstop_btn('stop', false);
                        Output.enable_input(true);
                    }
                } else {
                    if (e.data.command === 'printstab' && State.CMD_RUNNING === 'printstab') {
                        Output.add_to_output('center', {text: 'Stabilizer Group'});
                        Output.add_to_output('gen-table', {
                            gens: e.data.gens
                        });
                    } else if (e.data.command === 'printket' && State.CMD_RUNNING === 'printket') {
                        Output.add_to_output('ket-table', {
                            ket: e.data.ket
                        });
                    } else if (e.data.command === 'printstabanti' && State.CMD_RUNNING === 'printstabanti') {
                        Output.add_to_output('center', {text: 'Anti-Stabilizer Group'});
                        Output.add_to_output('gen-table', {
                            gens: e.data.gens
                        });
                    }

                    State.CMD_RUNNING = '';
                    set_pause_btn('resume', false);
                    step_btn_enabled(true);
                    set_runstop_btn('stop', false);
                    Output.enable_input(true);
                }
                break;

            case 'error':
                Output.add_to_output('error', {text: e.data.content});
                State.RUNNING  = false;
                State.PAUSED   = false;
                State.STEPPING = false;
                set_runstop_btn('stop');
                set_pause_btn('pause', true);
                step_btn_enabled(true);
                Output.enable_input(true);
                break;

            case 'continue?':
                if (e.data.command === 'run') {
                    if (State.RUNNING) {
                        if (!State.PAUSED) {
                            worker.postMessage({command: 'continue'});
                            Output.update_output_progress({
                                text: `Completed runs`,
                                progress: `${e.data.completed}`,
                                fill: (100.0*e.data.completed)/e.data.shots
                            });
                        } else {
                            if (e.data.command === 'run') {
                                Output.add_to_output('default', {text: 'Paused on'});
                                Output.add_to_output('source', {
                                    instr: e.data.tokens.instr,
                                    line:  e.data.tokens.source,
                                    args: Array.from(e.data.tokens.args)
                                });
                            }
                            Output.enable_input(true);
                        }
                    } else {
                        worker.postMessage({command: 'stop', what: 'run'});
                    }
                } else if (State.CMD_RUNNING === '') {
                    worker.postMessage({command: 'stop', what: e.data.command});
                }
                break;
            default:
                throw new Error(`unkown type ${e.data.type}`);
        }
    };

    const execute_command = function(tokens) {
        if (tokens.length < 1) {
            enable_input(true);
            return;
        }

        const command = tokens[0];

        switch(command) {
            case 'start':
                State.RUNNING = true;
                State.PAUSED  = true;
                set_runstop_btn('stop');
                set_pause_btn('resume');
                step_btn_enabled(true);

                worker.postMessage({
                    command: 'start', 
                    lines: Editor.get_lines(), 
                    qubits: State.USER_OPTIONS.qubits,
                    registers: State.USER_OPTIONS.registers,
                    shots: State.USER_OPTIONS.shots 
                });
                break;
            case 'run':
                State.RUNNING = true;
                set_runstop_btn('stop');
                set_pause_btn('pause');
                step_btn_enabled(false);
                Output.enable_input(false);

                worker.postMessage({
                    command: 'run', 
                    lines: Editor.get_lines(), 
                    qubits: State.USER_OPTIONS.qubits,
                    registers: State.USER_OPTIONS.registers,
                    shots: State.USER_OPTIONS.shots 
                });

                break;
            case 'pause':
                set_pause_btn('resume');
                step_btn_enabled(true);
                State.PAUSED = true;
                // worker will actually pause because of worker.onmessage
                break;
            case 'step':
                Output.enable_input(false);
                if (State.RUNNING && State.PAUSED) {
                    State.STEPPING = true;
                    worker.postMessage({
                        command: 'step'
                    });
                } else {
                    execute_command(['start']);
                }
                break;
            case 'stop':
                if (State.CMD_RUNNING === '') {
                    if (State.PAUSED) {
                        worker.postMessage({command: 'stop', what: 'step'});
                    } else {
                        State.RUNNING = false;
                        // buttons/textarea will be enabled once worker posts message
                        // asking to continue
                    }

                } else {
                    State.CMD_RUNNING = '';
                    set_runstop_btn('stop', true);
                    Output.add_to_output('error', {text: 'Terminating... waiting for worker'});
                }
                break;
            case 'resume':
                State.PAUSED = false;
                step_btn_enabled(false);
                set_pause_btn('pause');
                Output.enable_input(false);

                worker.postMessage({
                    command: 'resume'
                });
                break;
            case 'printket':
                if (State.RUNNING) {
                    State.CMD_RUNNING = 'printket';
                    step_btn_enabled(false);
                    set_pause_btn('resume', true);
                    Output.enable_input(false);

                    worker.postMessage({command: 'printket'});
                } else {
                    Output.add_to_output('default', 
                        {text: 'Nothing but chickens, step through the program first.'}
                    );
                    Output.enable_input(true);
                }
                break;
            case 'printstab':
                if (State.RUNNING) {
                    State.CMD_RUNNING = 'printstab';
                    step_btn_enabled(false);
                    set_pause_btn('resume', true);
                    Output.enable_input(false);

                    worker.postMessage({command: 'printstab'});
                } else {
                    Output.add_to_output('default', 
                        {text: 'Nothing but dinosaurs, step through the program first.'}
                    );
                    Output.enable_input(true);
                }
                break;
            case 'printstabanti':
                if (State.RUNNING) {
                    State.CMD_RUNNING = 'printstabanti';
                    step_btn_enabled(false);
                    set_pause_btn('resume', true);
                    Output.enable_input(false);

                    worker.postMessage({command: 'printstabanti'});
                } else {
                    Output.add_to_output('default', 
                        {text: 'Nothing but rabbits, step through the program first.'}
                    );
                    Output.enable_input(true);
                }
                break;
            default:
                Output.add_to_output('error', 
                    {text: `Unkown command '${command}'`});
                Output.enable_input(true);
        }
    };

    pause_btn.addEventListener('click', function(e) {
        if (!State.PAUSED && !pause_btn.classList.contains('paused-state')) {
            execute_command(['pause']);
        } else if (State.PAUSED && pause_btn.classList.contains('paused-state') ){
            Output.add_input_history({text: 'resume'});
            execute_command(['resume']);
        }

    });

    step_btn.addEventListener('click', function(e) {
        Output.add_input_history({text: 'step'});
        execute_command(['step']);
    });

    runstop_btn.addEventListener('click', function(e){
        if(!State.RUNNING && runstop_btn.classList.contains('run-state')) {
            Output.add_input_history({text: 'run'});
            execute_command(['run']);
        } else if (State.RUNNING){
            if (runstop_btn.classList.contains('stop-state')) {
                execute_command(['stop']);
                // button state will be changed in woker.onmessage
            }
        }
    });

    return {
        execute_command: execute_command
    };
})();

window.chp.editor.add_lines(`\
# middle man prepares entangled pair
hadamard 1
cnot 1 2
# alice: qubit 1
# bob: qubit 2

cnot 0 1
hadamard 0
measure 0 0 
measure 1 1

# alice send qubit 0 and qubit 1 to bob
cnot 0 3
cnot 1 4

# bob recovers teleported state
cnot 4 2
hadamard 2
cnot 3 2
hadamard 2
`);
