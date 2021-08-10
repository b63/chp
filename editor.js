if (!window['chp'])
    window['chp'] = {};

window.chp['editor'] = (function() {
    // Select the node that will be observed for mutations
    'use strict';
    const editor_node = document.getElementsByClassName('editor')[0];
    const gutter_node = document.getElementsByClassName('gutter')[0];

    const add_line_numbers = function(mutation_list, observer) {
        for (const mutation of mutation_list) {
            if (mutation.type === 'childList') {
                const lines    = editor_node.childNodes.length;
                const lines_ns = gutter_node.childNodes.length;

                const diff = (Math.max(1,lines) - lines_ns);
                if (diff > 0) {
                    for(let i = 0; i < diff; i++) {
                        const div = document.createElement('div');
                        const text = document.createTextNode((i+lines_ns+1).toString());
                        div.appendChild(text);
                        gutter_node.appendChild(div);
                    }
                } else {
                    for (let i = 0; i < -diff; i++) {
                        gutter_node.removeChild(gutter_node.lastChild);
                    }
                }
            }
        }
    };

    const get_caret = function(ed) {
        const sel = window.getSelection();
        const range = sel.getRangeAt(0);

        const endnode = range.endContainer;
        let offset  = range.endOffset;

        if (endnode.nodeType === Node.TEXT_NODE) {
            let prevnode = endnode.previousSibling;
            while (prevnode !== null)  {
                offset += prevnode.textContent.length;
                prevnode = prevnode.previousSibling
            }

            if (endnode.parentNode.tagName !== 'DIV') {
                // count previous spans if there are any
                prevnode = endnode.parentNode.previousSibling;
                while (prevnode !== null)  {
                    offset += prevnode.textContent.length;
                    prevnode = prevnode.previousSibling
                }
            }

            let div_node = endnode.parentNode;
            while (div_node.tagName !== 'DIV')
                div_node = div_node.parentNode;
            const index = Array.prototype.indexOf.call(ed.childNodes, div_node);

            return {index: index, offset: offset};
        } else if (endnode.classList.contains('editor')) {
            return {index: 0, offset: 0};
        }

        let div_node = endnode;
        while (div_node.tagName !== 'DIV')
            div_node = div_node.parentNode;
        const index = Array.prototype.indexOf.call(ed.childNodes, div_node);

        if (endnode.tagName === 'SPAN') {
            let prevnode = endnode.previousSibling;
            while (prevnode !== null)  {
                offset += prevnode.textContent.length;
                prevnode = prevnode.previousSibling
            }
            return {index: index, offset: offset};
        }

        return {index: index, offset: 0};
    };

    const push_rev = function (array, elems) {
        const len = elems.length;
        for (let i = len-1; i >= 0; i-- )
            array.push(elems[i]);
    }

    const set_caret = function(pos, ed) {
        const range = document.createRange();

        if (pos.index < ed.childNodes.length) {
            const div_node = ed.childNodes[pos.index];

            const stack = new Array();
            push_rev(stack, div_node.childNodes);

            let current = pos.offset;
            let textnode = null;
            while (stack.length > 0 && current > 0) {
                let cnode = stack.pop();
                if (cnode.nodeType === Node.TEXT_NODE) {
                    current -= cnode.textContent.length;
                    textnode = cnode;
                } else {
                    push_rev(stack, cnode.childNodes);
                }
            }
            if (textnode === null) {
                range.selectNodeContents(div_node);
                range.collapse(true);
            } else {
                const len = textnode.textContent.length;
                const offset = Math.min(len, len + current);
                range.setStart(textnode, offset);
                range.setEnd(textnode, offset);
            }
        } else {
            range.selectNodeContents(ed);
            range.collapse(false);
        }

        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    const highlight_editor = function(ed, keywords) {
        const linecount = ed.childNodes.length;
        for (let i = 0; i < linecount; i++) {
            let linenode = ed.childNodes[i];
            let inner_text = null;
            if (linenode.nodeType === Node.TEXT_NODE || linenode.tagName !== 'DIV') {
                inner_text = linenode.textContent;
                const div = document.createElement('div');
                const span = document.createElement('span');
                span.textContent = inner_text;
                div.append(span);
                ed.replaceChild(div, linenode);
                linenode = div;
            } else {
                inner_text = linenode.innerText;
            } 

            const spans = new Array();
            if (inner_text.trimStart().startsWith('#')) {
                const comment = document.createElement('span');
                comment.classList.add('comment');
                comment.textContent = inner_text;
                spans.push(comment);
            } else {
                const tokens = new Array();
                while (true) {
                    let idx  = inner_text.search(/[^\s]/);
                    if (idx < 0 && inner_text.length > 0) {
                        tokens.push({type: 'whitespace', 
                            text: '\xa0'.repeat(inner_text.length)});
                        break;
                    } else {
                        if (idx > 0) {
                            tokens.push({type: 'whitespace', 
                                text: '\xa0'.repeat(idx)
                            });
                            inner_text = inner_text.slice(idx);
                        }

                        idx = inner_text.search(/\s/);
                        if (idx > 0) { // idx should not be == 0
                            tokens.push({
                                type: 'word',
                                text: inner_text.substring(0, idx)
                            });
                            inner_text = inner_text.slice(idx);
                        } else {
                            tokens.push({ type: 'word', text: inner_text });
                            break;
                        }
                    }
                }

                const toks = tokens.length;
                for (let j = 0; j < toks; j++) {
                    const token = tokens[j];
                    const span = document.createElement('span');
                    span.textContent = token.text;
                    if (token.type === 'whitespace') {
                        span.classList.add('whitespace');
                    } else if (token.type === 'word') {
                        if (keywords.test(token.text)) {
                            span.classList.add('keyword');
                        }
                    }
                    spans.push(span);
                }
            }

            linenode.replaceChildren.apply(linenode, spans);
        }
    };

    editor_node.addEventListener('beforeinput', function(e){
        if (editor_node.childNodes.length < 1 && e.inputType !== 'insertFromPaste') {
            const div = document.createElement('div');
            const span = document.createElement('span');
            if (e.data) {
                span.textContent = e.data;
            } else {
                span.append(document.createElement('br'));
            }
            div.append(span);
            editor_node.append(div);

            const sel = window.getSelection();
            sel.removeAllRanges();
            const range = document.createRange();
            range.setStartAfter(span, 0);
            range.setEndAfter(span, 0);
            sel.addRange(range);

            e.preventDefault();
        }
    });

    editor_node.addEventListener('paste', function(e){
        let paste = (e.clipboardData || window.clipboardData).getData('text/plain');
        //console.log(paste);

        const selection = window.getSelection();
        if (selection.rangeCount < 1)
            return;
        e.preventDefault();
        selection.deleteFromDocument();

        const range     = selection.getRangeAt(0);
        const startnode = range.startContainer;
        const offset    = range.startOffset;

        const lines     = paste.split('\n');
        const first_line = lines[0];
        const slines    = lines.splice(1);

        const pasted_range = document.createRange();

        let frag = null;
        if (slines.length > 0) {
            frag = document.createDocumentFragment();
            for(const line of slines) {
                const div = document.createElement('div');
                const span = document.createElement('span');
                if (line === '') {
                    span.appendChild(document.createElement('br'));
                } else {
                    span.textContent = line;
                }

                div.appendChild(span);
                frag.appendChild(div);
            }
        }

        console.log(range.startOffset);
        console.log(range.startContainer);
        if (startnode.nodeType === Node.TEXT_NODE) {
            const start_text = startnode.textContent.substring(0, offset);
            const end_text   = startnode.textContent.substring(offset);

            if (frag === null) {
                startnode.textContent = start_text + first_line + end_text;
                pasted_range.setStart(startnode, offset);
                pasted_range.setEnd(startnode, offset + first_line.length);
            } else {
                // frag -> div -> span -> #text
                let last_textnode = frag.lastChild.lastChild.lastChild;
                if (last_textnode === null){
                    last_textnode = document.createTextNode("");
                    frag.lastChild.lastChild.append(last_textnode);
                }

                const end_offset = last_textnode.textContent.length;
                startnode.textContent = start_text + first_line;
                last_textnode.textContent += end_text;

                //let ccount = frag.childElementCount;
                let last_div = startnode.parentNode.parentNode;
                last_div.parentNode.insertBefore(frag, last_div.nextSibling);

                //while (ccount-- > 0)
                //    last_div = last_div.nextSibling;

                //const last_textnode = last_div.lastChild.lastChild;
                pasted_range.setStart(startnode, offset);
                pasted_range.setEnd(last_textnode, end_offset);
            }
        } else if (startnode.tagName === 'DIV') {
            if (startnode.classList.contains('editor')) {
                const div = document.createElement('div');
                const span = document.createElement('span');
                span.textContent = first_line;
                div.appendChild(span);

                if (frag === null) {
                    startnode.appendChild(div);
                    pasted_range.selectNodeContents(div);
                } else {
                    const last_div = frag.lastChild;
                    frag.prepend(div);
                    startnode.prepend(frag);
                    pasted_range.setStart(startnode.firstChild, 0);
                    pasted_range.setEndAfter(last_div, 0);
                }
            } else {
                const span = document.createElement('span');
                span.textContent = first_line;
                startnode.prepend(span);

                if (frag !== null) {
                    const last_div = frag.lastChild;
                    const last_span = frag.lastChild.lastChild;
                    let node = span.nextSibling;
                    while (node !== null) {
                        const next = node.nextSibling;
                        last_div.append(node);
                        node = next;
                    }
                    editor_node.insertBefore(frag, startnode.nextSibling);
                    pasted_range.setStart(span, 0);
                    pasted_range.setEndAfter(last_span, 0);
                } else {
                    pasted_range.selectNodeContents(span);
                }
            }
        } else {// if (startnode.tagName === 'SPAN') {
            const span = document.createElement('span');
            span.textContent = first_line;
            startnode.insertAdjacentElement('beforebegin', span);
            pasted_range.setStart(span, 0);

            if (frag !== null) {
                let node = startnode;
                const next_div = startnode.parentNode.nextSibling;
                const last_div = frag.lastChild;
                const last_span = frag.lastChild.lastChild;
                while (node !== null) {
                    const next = node.nextSibling;
                    last_div.append(node);
                    node = next;
                }
                console.log(startnode.parentNode);
                editor_node.insertBefore(frag, next_div);
                pasted_range.setEndAfter(last_span, 0);
            } else {
                pasted_range.setEndAfter(span, 0);
            }
        }

        selection.removeAllRanges();
        selection.addRange(pasted_range);

    });


    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(add_line_numbers);
    // Start observing the target node for configured mutations
    observer.observe(editor_node, {childList: true});

    const get_lines = function() {
        const len = editor_node.childNodes.length;
        let lines = new Array();

        for (let i = 0; i < len; i++) {
            let str = editor_node.childNodes[i].textContent.trim();
            if (str.startsWith('#') || str === '')
                continue;
            lines.push({text: str, lineno: i+1});
            console.log(`${i+1}: ${str}`);
        }
        return lines;
    };

    const keywords = /^(m|measure|h|hadamard|p|phase|cnot|c)$/i;
    editor_node.addEventListener('input', function(e){
        const cpos = get_caret(editor_node);
        highlight_editor(editor_node, keywords);
        set_caret(cpos, editor_node);
    });

    const add_lines = function(text) {
        const lines = text.split('\n');
        const num = lines.length;

        const frag = document.createDocumentFragment();
        for (const line of lines) {
            const div  = document.createElement('div');
            const span = document.createElement('span');
            span.textContent = line;
            div.append(span);
            frag.append(div);
        }
        editor_node.append(frag);
        // redo highlighting
        //const cpos = get_caret(editor_node);
        highlight_editor(editor_node, keywords);
        //set_caret(cpos, editor_node);
    }

    return {
        get_lines: get_lines,
        add_lines: add_lines
    }
})();
