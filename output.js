if (!window['chp']) {
    window['chp'] = {};
}

if (!window.chp['state']) {
    window.chp['state'] = {};
}

window.chp.state['RUNNING']  = false;
window.chp.state['PAUSED']   = false;
window.chp.state['STEPPING'] = false;
window.chp.state['CMD_RUNNING'] = '';

window.chp['output'] = (function() {
    'use strict';
    const State = window.chp.state;

    const editor_node = document.getElementsByClassName('editor')[0];

    const output_box   = document.querySelector(".output");
    const output_div   = document.querySelector(".output-container .output-history");
    const input_div    = document.querySelector(".input-container .output-input-line");
    const txtarea_node = document.querySelector(".output-input-line textarea");

    output_box.addEventListener('click', function(e) {
        const y_min = txtarea_node.getBoundingClientRect().top;
        const y = e.clientY;
        if (y >= y_min) {
            txtarea_node.focus();
        }
    });

    txtarea_node.addEventListener("input", function(e) {
        txtarea_node.style.height = txtarea_node.scrollHeight + "px";

    });

    const add_input_history = function (data) {
        const entry_div = document.createElement('div');
        entry_div.classList.add('output-entry');

        const input_div = document.createElement('div');
        input_div.classList.add('output-input-line');

        const p       = document.createElement('p');
        p.textContent = data.text;
        p.style.display = "inline";

        input_div.appendChild(p);
        entry_div.appendChild(input_div);
        output_div.appendChild(entry_div);

        // scroll to bottom
        output_box.scrollTop = output_box.scrollHeight;
    };

    const update_output_progress = function(data) {
        const last_entry = output_div.lastChild;

        if (last_entry.childNodes.length < 2) {
            add_to_output('progress', data);
            return;
        }
        const result_div = last_entry.lastChild;
        const div = result_div.querySelector('.type-progress:last-child');

        if (!div) {
            add_to_output('progress', data);
            return;
        }

        const lbl     = div.children[0].children[0];
        const barfill = div.children[1].children[0];
        const frac    = div.children[2].children[0];

        lbl.textContent = data.text;
        barfill.style.width = data.fill + '%';
        frac.textContent = data.progress;
    }

    const create_output_table = function(headers, rows, text_align, col_opts) {
        col_opts = col_opts || {};
        text_align = text_align || [];

        const table = document.createElement('table');
        const tbody = document.createElement('tbody');

        const len = rows.length;
        if (headers) {
            const tr = document.createElement('tr');
            const clen = headers.length;
            for (const item of headers) {
                const th = document.createElement('th');
                th.textContent = item;
                tr.appendChild(th);
            }
            tbody.appendChild(tr);
        }

        const mathjax_content = [];
        for (let i = 0; i < len; i++) {
            const tr = document.createElement('tr');

            const clen = rows[i].length;
            for (let j = 0; j < clen; j++) {
                const td = document.createElement('td');
                td.textContent = rows[i][j];
                td.style['text-align'] = (text_align[j] || 'left');
                if (col_opts[j] === 'mathjax') {
                    mathjax_content.push({node: td, text: rows[i][j]});
                    td.classList.add('td-mathjax');
                }

                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        let promise = null;
        const options = {display: false};
        for (const item of mathjax_content) {
            if (promise === null) {
                promise = MathJax.tex2svgPromise(item.text, options).then(
                    (svg) => {
                        item.node.innerHTML = '';
                        svg.children[1].remove();
                        item.node.append(svg);
                    });
            } else {
                promise = promise.then(
                    () => MathJax.tex2svgPromise(item.text, options)
                ).then((svg) => {
                        item.node.innerHTML = '';
                        svg.children[1].remove();
                        item.node.append(svg);
                });
            }
        }

        return table;
    };

    const add_to_output = function(type, data) {
        if (output_div.children.length === 0) {
            const entry_div = document.createElement('div');
            entry_div.classList.add('output-entry');
            output_div.append(entry_div);
        }

        const last_entry = output_div.lastChild;

        let result_div = null;
        if (last_entry.childNodes.length > 1) {
            result_div = last_entry.lastChild;
        } else {
            result_div = document.createElement('div');
            result_div.classList.add('output-result');
            last_entry.appendChild(result_div);
        }

        const add_line = function(text, extra_class) {
            const div = document.createElement('div');
            div.classList.add('output-line');
            if(extra_class)
                div.classList.add(extra_class);

            const span = document.createElement('span');
            span.textContent = text.trim();
            div.appendChild(span);
            result_div.appendChild(div);
        };

        if (type === 'progress') {
            const div = document.createElement('div');
            div.classList.add('output-line');
            div.classList.add('type-progress');

            const div_lbl  = document.createElement('div');
            div_lbl.classList.add('label');
            const div_frac = document.createElement('div');
            div_frac.classList.add('fraction');

            const div_pbar  = document.createElement('div');
            div_pbar.classList.add('progress-bar');
            const div_pbarfill  = document.createElement('div');
            div_pbarfill.classList.add('progress-bar-fill');

            const span_lbl = document.createElement('span');
            span_lbl.textContent = data.text;
            const span_frac = document.createElement('span');
            span_frac.textContent = data.progress;

            div_pbarfill.style.width = Math.ceil(data.fill)+ "%";

            div_lbl.appendChild(span_lbl);
            div_frac.appendChild(span_frac);
            div_pbar.appendChild(div_pbarfill);
            div.appendChild(div_lbl);
            div.appendChild(div_pbar);
            div.appendChild(div_frac);

            result_div.appendChild(div);
        } else if (type === 'source') {
            const div = document.createElement('div');
            div.classList.add('output-line');
            div.classList.add('type-source');

            const numdiv     = document.createElement('div');
            numdiv.classList.add('line-number');
            const numspan    = document.createElement('span');
            numspan.textContent = data.line;
            numdiv.append(numspan);

            const instrdiv   = document.createElement('div');
            instrdiv.classList.add('line-content');
            const instrspan  = document.createElement('span');
            const argsspan   = document.createElement('span');

            instrspan.textContent = data.instr + " ";
            instrspan.classList.add('keyword');
            argsspan.textContent  = data.args.join(' ');
            instrdiv.append(instrspan);
            instrdiv.append(argsspan);

            div.append(numdiv);
            div.append(instrdiv);

            result_div.append(div);
        } else if (type === 'results-table') {
            add_line('Results', 'type-center');

            let formatted_results = new Array(data.results.length);
            for (let i = 0; i < data.results.length; i++) {
                const col = data.results[i];
                let fcol = new Array(3);
                fcol[0] = `${col[0]}`;
                fcol[1] = `${(col[1]*100).toFixed(2)} %`
                fcol[2] = `${col[2]}`;
                formatted_results[i] = fcol;
            }

            const table = create_output_table(
                ['Register Value', 'Prob', 'Counts'],
                formatted_results,
                ['center', 'right', 'right']
            );

            const div = document.createElement('div');
            div.classList.add('output-line');
            div.classList.add('type-results-table');
            div.classList.add('type-table');
            div.appendChild(table);
            result_div.appendChild(div);
        } else if (type === 'ket-table') {
            const rowlen = data.ket.length;
            const formatted = new Array(rowlen);
            for (let i = 0; i < rowlen; i++) {
                const ket = data.ket[i];
                const basis = `|${ket.basis}〉`;
                let frac = ket.coeftop;
                if (ket.coefbot !== '1') {
                    frac = `\\frac{${frac}}{${ket.coefbot}}`;
                }

                formatted[i] = [basis, `\\mathsf{${frac}}`];
            }
            const table = create_output_table(['Basis', 'Coefficient'], 
                formatted, ['center', 'center'], {1: 'mathjax'}
            );

            const div = document.createElement('div');
            div.classList.add('output-line');
            div.classList.add('type-ket-table');
            div.classList.add('type-table');
            div.appendChild(table);
            result_div.appendChild(div);
        } else if (type === 'gen-table') {
            const rowlen = data.gens.length;
            const formatted = new Array(rowlen);
            for (let i = 0; i < rowlen; i++) {
                const gates = data.gens[i];
                formatted[i] = [i, `${gates}`];
            }
            const table = create_output_table(['', 'Generator'], 
                formatted, ['right', 'left'], {1: 'mathjax'}
            );

            const div = document.createElement('div');
            div.classList.add('output-line');
            div.classList.add('type-gen-table');
            div.classList.add('type-table');
            div.appendChild(table);
            result_div.appendChild(div);
        } else {
            const lines = data.text.split('\n');
            const len   = lines.length;
            for (let i = 0; i < len; i++) {
                add_line(lines[i], `type-${type}`);
            }
        }

        // scroll to bottom
        output_box.scrollTop = output_box.scrollHeight;
    };


    txtarea_node.addEventListener("keydown", function(e){
        if (e.keyCode !== 13)
            return;

        e.preventDefault();
        const text = txtarea_node.value;
        txtarea_node.value = "";
        add_input_history({text: text});
        enable_input(false);

        const tokens = text.split(/\s/).filter(x => x.length > 0);
        window.chp.main.execute_command(tokens);
    });

    const enable_input = function(enable) {
        if (enable === true) {
            input_div.style.display = 'block';
            txtarea_node.focus();
        } else {
            input_div.style.display = 'none';
        }

        // scroll to bottom
        output_box.scrollTop = output_box.scrollHeight;
    };

    return {
        add_to_output: add_to_output,
        update_output_progress: update_output_progress,
        add_input_history: add_input_history,
        enable_input: enable_input
    };
})();
