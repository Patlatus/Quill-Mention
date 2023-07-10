import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import QuillStaticResource from '@salesforce/resourceUrl/Quill';

import { loadScript, loadStyle } from 'lightning/platformResourceLoader';

export default class Mention extends LightningElement {
    @api atValues = [];
    @api hashValues = [];
    @api matchFunction = searchTerm => x => x.Name.toLowerCase().includes(searchTerm.toLowerCase());
    @api renderItem = item => `${item.Name}`;
    @track filtered = [];
    firstRender = false;

    _contentEditable = false;

    @api
    get contentEditable() {
        return this._contentEditable;
    }

    set contentEditable(value) {
        this._contentEditable = value;
        this.quill?.root.setAttribute('contenteditable', value);
    }

    @api enableEdit() {
        this._contentEditable = true;
        this.quill.root.setAttribute('contenteditable', true);
    }

    reduce(errors) {
        if (!Array.isArray(errors)) {
            errors = [errors];
        }
        let err = errors[0];
        if (err.messages && Array.isArray(err.messages)) {
            errors = errors.concat(err.messages);
        }
        if (err.body && Array.isArray(err.body.pageErrors)) {
            errors = errors.concat(err.body.pageErrors);
        }
        if (err.body && Array.isArray(err.body.duplicateResults)) {
            errors = errors.concat(err.body.duplicateResults);
        }
        if (err.body && err.body.fieldErrors) {
            for (const x in err.body.fieldErrors) {
                if (Object.prototype.hasOwnProperty.call(err.body.fieldErrors, x)) {
                    errors = errors.concat(err.body.fieldErrors[x]);
                }
            }
        }

        return (
            errors
                // Remove null/undefined items
                .filter(error => !!error)
                // Extract an error message
                .map(error => {
                    // UI API read errors
                    if (Array.isArray(error.body)) {
                        return error.body.map(e => e.message);
                    }
                    // UI API DML, Apex and network errors
                    else if (error.body && typeof error.body.message === 'string') {
                        return error.body.message;
                    } else if (typeof error.problem === 'string') {
                        return error.problem;
                    }
                    // JS errors
                    else if (typeof error.message === 'string') {
                        return error.message;
                    }

                    // Unknown error shape so try HTTP status text
                    return error.statusText;
                })
                // Flatten
                .reduce((prev, curr) => prev.concat(curr), [])
                // Remove empty strings
                .filter(message => !!message)
                .join('. ')
        );
    }

    displayError(error) {
        if (typeof ShowToastEvent !== 'undefined') {
            this.dispatchEvent(
                new ShowToastEvent({
                    variant: 'error',
                    title: 'Error',
                    message: this.reduce(error)
                })
            );
        } else {
            console.log(this.reduce(error));
        }
    }

    renderedCallback() {
        if (!this.firstRender) {
            this.firstRender = true;
            Promise.all([
                loadScript(this, QuillStaticResource + '/quill.js'),
                loadStyle(this, QuillStaticResource + '/quill.snow.css')
            ])
                .then(() => {
                    this.initQuill(this.template.querySelector('div.mention-container'), this);

                    this.quill.root.setAttribute('contenteditable', this._contentEditable);

                    this.quill.setText(this._text);
                })
                .catch(error => {
                    this.displayError(error);
                });
        }
    }

    initQuill(nodeElement, main) {
        const Keys = {
            TAB: 9,
            ENTER: 13,
            ESCAPE: 27,
            UP: 38,
            DOWN: 40
        };
        const Embed = Quill.import('blots/embed');

        class MentionBlot extends Embed {
            // rg
            hoverHandler;

            constructor(scroll, node) {
                super(scroll, node);
                this.clickHandler = null;
                this.hoverHandler = null;
                this.mounted = false;
            }
            // rg end

            static create(data) {
                const node = super.create();
                const denotationChar = document.createElement('span');
                denotationChar.className = 'ql-mention-denotation-char';
                denotationChar.innerHTML = data.denotationChar;
                node.appendChild(denotationChar);
                node.innerHTML += data.value;
                return MentionBlot.setDataValues(node, data);
            }

            static setDataValues(element, data) {
                const domNode = element;
                Object.keys(data).forEach(key => {
                    domNode.dataset[key] = data[key];
                });
                return domNode;
            }

            static value(domNode) {
                return domNode.dataset;
            }

            attach() {
                super.attach();
                if (!this.mounted) {
                    this.mounted = true;
                    this.clickHandler = this.getClickHandler();
                    this.hoverHandler = this.getHoverHandler();
                    this.domNode.addEventListener('click', this.clickHandler, false);
                    this.domNode.addEventListener('mouseenter', this.hoverHandler, false);
                }
            }

            detach() {
                super.detach();
                this.mounted = false;
                if (this.clickHandler) {
                    this.domNode.removeEventListener('click', this.clickHandler);
                    this.clickHandler = null;
                }
            }

            // rg
            getClickHandler() {
                return e => {
                    const event = this.buildEvent('mention-clicked', e);
                    window.dispatchEvent(event);
                    e.preventDefault();
                };
            }

            getHoverHandler() {
                return e => {
                    const event = this.buildEvent('mention-hovered', e);
                    window.dispatchEvent(event);
                    e.preventDefault();
                };
            }

            buildEvent(name, e) {
                const event = new CustomEvent(name, {
                    bubbles: true,
                    cancelable: true
                });
                event.value = Object.assign({}, this.domNode.dataset);
                event.event = e;
                return event;
            }

            hoverHandler;
            // rg ends

            /**
             * Redefine the `update` method to handle the `childList` case.
             * This is necessary to correctly handle "backspace" on Android using Gboard.
             * It behaves differently than other cases and we need to handle the node
             * removal instead of the `characterData`.
             */
            update(mutations, context) {
                // `childList` mutations are not handled on Quill
                // see `update` implementation on:
                // https://github.com/quilljs/quill/blob/master/blots/embed.js

                mutations.forEach(mutation => {
                    if (mutation.type !== 'childList') return;
                    if (mutation.removedNodes.length === 0) return;

                    // eslint-disable-next-line @lwc/lwc/no-async-operation
                    setTimeout(() => this._remove(), 0);
                });

                const unhandledMutations = mutations.filter(m => m.type !== 'childList');
                super.update(unhandledMutations, context);
            }

            _remove() {
                // NOTE: call this function as:
                // setTimeout(() => this._remove(), 0);
                // otherwise you'll get the error: "The given range isn't in document."
                const cursorPosition = this.quill.getSelection().index - 1;

                // see `remove` implementation on:
                // https://github.com/quilljs/parchment/blob/master/src/blot/abstract/shadow.ts
                this.remove();

                // schedule cursor positioning after quill is done with whatever has scheduled
                // eslint-disable-next-line @lwc/lwc/no-async-operation
                setTimeout(() => this.quill.setSelection(cursorPosition, Quill.sources.API), 0);
            }
        }

        MentionBlot.blotName = 'mention';
        MentionBlot.tagName = 'span';
        MentionBlot.className = 'mention';
        Quill.register(MentionBlot);

        this.isOpen = false;
        this.itemIndex = 0;
        this.mentionCharPos = null;
        this.cursorPos = null;
        this.values = [];
        this.suspendMouseEnter = false;
        //this token is an object that may contains one key "abandoned", set to
        //true when the previous source call should be ignored in favor or a
        //more recent execution.  This token will be null unless a source call
        //is in progress.
        this.existingSourceExecutionToken = null;

        this.options = {
            source: function (searchTerm, renderList, mentionChar) {
                let values;

                if (mentionChar === '@') {
                    values = main.atValues;
                } else {
                    values = main.hashValues;
                }

                main.filtered = values.filter(main.matchFunction(searchTerm));
                renderList(main.filtered, searchTerm);
            },
            renderItem(item) {
                return main.renderItem(item);
            },
            renderLoading() {
                return null;
            },
            onSelect(item, insertItem) {
                insertItem(item);
            },
            mentionDenotationChars: ['@', '#'],
            showDenotationChar: true,
            allowedChars: /^[a-zA-Z0-9_]*$/,
            minChars: 0,
            maxChars: 31,
            offsetTop: 2,
            offsetLeft: 0,
            isolateCharacter: false,
            fixMentionsToQuill: false,
            positioningStrategy: 'normal',
            defaultMenuOrientation: 'bottom',
            blotName: 'mention',
            dataAttributes: ['Id', 'value', 'denotationChar', 'link', 'target', 'disabled'],
            linkTarget: '_blank',
            onOpen() {
                return true;
            },
            onClose() {
                return true;
            },
            // Style options
            listItemClass: 'ql-mention-list-item',
            mentionContainerClass: 'ql-mention-list-container',
            mentionListClass: 'ql-mention-list',
            spaceAfterInsert: true,
            selectKeys: [Keys.ENTER]
        };

        /* combination of styles .forceChatterAutocomplete.defaultFlavor .uiAutocomplete .uiAutocompleteList will give z-index: 10 */
        //create mention container
        this.mentionContainer = document.createElement('div');
        this.mentionContainer.className =
            'defaultFlavor forceChatterAutocomplete forceChatterMentionAutocomplete ' +
            (this.options.mentionContainerClass ? this.options.mentionContainerClass : '');

        this.mentionContainer1 = document.createElement('div');
        this.mentionContainer1.className = 'uiInput uiAutocomplete uiInput--default uiInput--lookup';

        this.mentionContainer.appendChild(this.mentionContainer1);

        this.mentionContainer2 = document.createElement('div');
        this.mentionContainer2.className = 'cuf-autocompleteClass lookup__menu uiAbstractList uiAutocompleteList';

        this.mentionContainer1.appendChild(this.mentionContainer2);

        this.mentionContainer3 = document.createElement('div');
        this.mentionContainer3.className = this.options.mentionContainerClass ? this.options.mentionContainerClass : '';
        this.mentionContainer.style.cssText = 'display: none; position: absolute;';
        this.mentionContainer.onmousemove = this.onContainerMouseMove.bind(this);

        if (this.options.fixMentionsToQuill) {
            this.mentionContainer.style.width = 'auto';
        }
        this.mentionContainer2.appendChild(this.mentionContainer3);

        this.mentionList = document.createElement('ul');

        this.mentionList.role = 'presentation';
        this.mentionList.className =
            'lookup__list  visible ' + (this.options.mentionListClass ? this.options.mentionListClass : '');
        this.mentionContainer3.appendChild(this.mentionList);

        let quill = new Quill(nodeElement, this.options);
        /* Important: Lightning Experience fixes for Quill library */
        quill.selection.hasFocus = function () {
            return this.root._template && this.root._template.activeElement === this.root;
        };
        let _slicedToArray = (function () {
            function sliceIterator(arr, i) {
                var _arr = [];
                var _n = true;
                var _d = false;
                var _e;
                try {
                    for (let _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
                        _arr.push(_s.value);
                        if (i && _arr.length === i) break;
                    }
                } catch (err) {
                    _d = true;
                    _e = err;
                } finally {
                    try {
                        if (!_n && _i.return) _i.return();
                    } finally {
                        // eslint-disable-next-line no-unsafe-finally
                        if (_d) throw _e;
                    }
                }
                return _arr;
            }
            return function (arr, i) {
                if (Array.isArray(arr)) {
                    return arr;
                } else if (Symbol.iterator in Object(arr)) {
                    return sliceIterator(arr, i);
                    // eslint-disable-next-line no-else-return
                } else {
                    throw new TypeError('Invalid attempt to destructure non-iterable instance');
                }
            };
        })();

        quill.selection.getBounds = function (index) {
            var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

            var scrollLength = this.scroll.length();
            index = Math.min(index, scrollLength - 1);
            length = Math.min(index + length, scrollLength - 1) - index;
            // eslint-disable-next-line no-void
            let node = void 0,
                _scroll$leaf = this.scroll.leaf(index),
                _scroll$leaf2 = _slicedToArray(_scroll$leaf, 2),
                leaf = _scroll$leaf2[0],
                offset = _scroll$leaf2[1];
            if (leaf == null) {
                return null;
            }

            let _leaf$position = leaf.position(offset, true);

            let _leaf$position2 = _slicedToArray(_leaf$position, 2);

            node = _leaf$position2[0];
            offset = _leaf$position2[1];

            let range = document.createRange();
            if (length > 0) {
                range.setStart(node, offset);

                let _scroll$leaf3 = this.scroll.leaf(index + length);

                let _scroll$leaf4 = _slicedToArray(_scroll$leaf3, 2);

                leaf = _scroll$leaf4[0];
                offset = _scroll$leaf4[1];

                if (leaf == null) return null;

                let _leaf$position3 = leaf.position(offset, true);

                let _leaf$position4 = _slicedToArray(_leaf$position3, 2);

                node = _leaf$position4[0];
                offset = _leaf$position4[1];

                range.setEnd(node, offset);
                return range.getBoundingClientRect();
                // eslint-disable-next-line no-else-return
            } else {
                let side = 'left';
                // eslint-disable-next-line no-void
                let rect = void 0;
                if (node instanceof Text || node.tagName === '#text') {
                    if (offset < node.data.length) {
                        range.setStart(node, offset);
                        range.setEnd(node, offset + 1);
                    } else {
                        range.setStart(node, offset - 1);
                        range.setEnd(node, offset);
                        side = 'right';
                    }
                    rect = range.getBoundingClientRect();
                } else {
                    rect = leaf.domNode.getBoundingClientRect();
                    if (offset > 0) side = 'right';
                }
                return {
                    bottom: rect.top + rect.height,
                    height: rect.height,
                    left: rect[side],
                    right: rect[side],
                    top: rect.top,
                    width: 0
                };
            }
        };

        this.quill = quill;
        quill.root.classList.add('slds-rich-text-area__content');
        quill.root._template = this.template;

        quill.on('text-change', this.onTextChange.bind(this));
        quill.on('selection-change', this.onSelectionChange.bind(this));

        //Pasting doesn't fire selection-change after the pasted text is
        //inserted, so here we manually trigger one
        quill.container.addEventListener('paste', () => {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                const range = quill.getSelection();
                this.onSelectionChange(range);
            });
        });

        quill.keyboard.addBinding(
            {
                key: Keys.TAB
            },
            this.selectHandler.bind(this)
        );
        quill.keyboard.bindings[Keys.TAB].unshift(quill.keyboard.bindings[Keys.TAB].pop());

        quill.keyboard.addBinding(
            {
                key: Keys.ENTER
            },
            this.enterHandler.bind(this)
        );
        quill.keyboard.bindings[Keys.ENTER].unshift(quill.keyboard.bindings[Keys.ENTER].pop());

        for (let selectKey of this.options.selectKeys) {
            quill.keyboard.addBinding(
                {
                    key: selectKey
                },
                this.selectHandler.bind(this)
            );
        }
        quill.keyboard.bindings[Keys.ENTER].unshift(quill.keyboard.bindings[Keys.ENTER].pop());

        quill.keyboard.addBinding(
            {
                key: Keys.ESCAPE
            },
            this.escapeHandler.bind(this)
        );

        quill.keyboard.addBinding(
            {
                key: Keys.UP
            },
            this.upHandler.bind(this)
        );

        quill.keyboard.addBinding(
            {
                key: Keys.DOWN
            },
            this.downHandler.bind(this)
        );
    }

    // quill.mention.utils
    attachDataValues(element, data, dataAttributes) {
        const mention = element;
        Object.keys(data).forEach(key => {
            if (dataAttributes.indexOf(key) > -1) {
                mention.dataset[key] = data[key];
            } else {
                delete mention.dataset[key];
            }
        });
        return mention;
    }

    getMentionCharIndex(text, mentionDenotationChars) {
        return mentionDenotationChars.reduce(
            (prev, mentionChar) => {
                const mentionCharIndex = text.lastIndexOf(mentionChar);

                if (mentionCharIndex > prev.mentionCharIndex) {
                    return {
                        mentionChar,
                        mentionCharIndex
                    };
                }
                return {
                    mentionChar: prev.mentionChar,
                    mentionCharIndex: prev.mentionCharIndex
                };
            },
            { mentionChar: null, mentionCharIndex: -1 }
        );
    }

    hasValidChars(text, allowedChars) {
        return allowedChars.test(text);
    }

    hasValidMentionCharIndex(mentionCharIndex, text, isolateChar) {
        if (mentionCharIndex > -1) {
            if (isolateChar && !(mentionCharIndex === 0 || !!text[mentionCharIndex - 1].match(/\s/g))) {
                return false;
            }
            return true;
        }
        return false;
    }
    // end of quill.mention.utils
    selectHandler() {
        if (this.isOpen && !this.existingSourceExecutionToken) {
            this.selectItem();
            return false;
        }
        return true;
    }

    enterHandler() {
        if (!this.isOpen) {
            this.quill.root.setAttribute('contenteditable', false);
            this.dispatchEvent(new CustomEvent('enterkey'));
        }
        return true;
    }

    escapeHandler() {
        if (this.isOpen) {
            if (this.existingSourceExecutionToken) {
                this.existingSourceExecutionToken.abandoned = true;
            }
            this.hideMentionList();
            return false;
        }
        return true;
    }

    upHandler() {
        if (this.isOpen && !this.existingSourceExecutionToken) {
            this.prevItem();
            return false;
        }
        return true;
    }

    downHandler() {
        if (this.isOpen && !this.existingSourceExecutionToken) {
            this.nextItem();
            return false;
        }
        return true;
    }

    showMentionList() {
        if (this.options.positioningStrategy === 'fixed') {
            document.body.appendChild(this.mentionContainer);
        } else {
            this.quill.container.appendChild(this.mentionContainer);
        }

        this.mentionContainer.style.visibility = 'hidden';
        this.mentionContainer.style.display = '';
        this.mentionContainer.scrollTop = 0;
        this.setMentionContainerPosition();
        this.setIsOpen(true);
    }

    hideMentionList() {
        this.mentionContainer.style.display = 'none';
        this.mentionContainer.remove();
        this.setIsOpen(false);
    }

    highlightItem(scrollItemInView = true) {
        for (let i = 0; i < this.mentionList.childNodes.length; i += 1) {
            this.mentionList.childNodes[i].classList.remove('highlighted');
        }
        if (this.itemIndex === -1 || this.mentionList.childNodes[this.itemIndex].dataset.disabled === 'true') {
            return;
        }

        this.mentionList.childNodes[this.itemIndex].classList.add('highlighted');
        if (scrollItemInView) {
            // this.mentionList.childNodes[this.itemIndex].scrollIntoView();
            const itemHeight = this.mentionList.childNodes[this.itemIndex].offsetHeight;
            const itemPos = this.mentionList.childNodes[this.itemIndex].offsetTop;
            const containerTop = this.mentionContainer.scrollTop;
            const containerBottom = containerTop + this.mentionContainer.offsetHeight;

            if (itemPos < containerTop) {
                // Scroll up if the item is above the top of the container
                this.mentionContainer.scrollTop = itemPos;
            } else if (itemPos > containerBottom - itemHeight) {
                // scroll down if any part of the element is below the bottom of the container
                this.mentionContainer.scrollTop += itemPos - containerBottom + itemHeight;
            }
        }
    }

    getItemData() {
        const { link } = this.mentionList.childNodes[this.itemIndex].dataset;
        const hasLinkValue = typeof link !== 'undefined';
        const itemTarget = this.mentionList.childNodes[this.itemIndex].dataset.target;
        if (hasLinkValue) {
            this.mentionList.childNodes[this.itemIndex].dataset.value = `<a href="${link}" target=${
                itemTarget || this.options.linkTarget
            }>${this.mentionList.childNodes[this.itemIndex].dataset.value}`;
        }
        return this.mentionList.childNodes[this.itemIndex].dataset;
    }

    onContainerMouseMove() {
        this.suspendMouseEnter = false;
    }

    selectItem() {
        if (this.itemIndex === -1) {
            return;
        }
        const data = this.getItemData();
        // LWC Locker Service converts Boolean dataset properties into String and I cannot find a way to stop this
        if (data.disabled === 'true') {
            return;
        }
        this.options.onSelect(data, asyncData => {
            this.insertItem(asyncData);
        });
        this.hideMentionList();
    }

    insertItem(data, programmaticInsert) {
        const render = data;
        if (render === null) {
            return;
        }
        if (!this.options.showDenotationChar) {
            render.denotationChar = '';
        }

        let insertAtPos;

        if (!programmaticInsert) {
            insertAtPos = this.mentionCharPos;
            this.quill.deleteText(this.mentionCharPos, this.cursorPos - this.mentionCharPos, Quill.sources.USER);
        } else {
            insertAtPos = this.cursorPos;
        }
        this.quill.insertEmbed(insertAtPos, this.options.blotName, render, Quill.sources.USER);
        if (this.options.spaceAfterInsert) {
            this.quill.insertText(insertAtPos + 1, ' ', Quill.sources.USER);
            // setSelection here sets cursor position
            this.quill.setSelection(insertAtPos + 2, Quill.sources.USER);
        } else {
            this.quill.setSelection(insertAtPos + 1, Quill.sources.USER);
        }
        this.hideMentionList();
    }

    onItemMouseEnter(e) {
        if (this.suspendMouseEnter) {
            return;
        }

        const index = Number(e.target.dataset.index);

        if (!Number.isNaN(index) && index !== this.itemIndex) {
            this.itemIndex = index;
            this.highlightItem(false);
        }
    }

    onDisabledItemMouseEnter() {
        if (this.suspendMouseEnter) {
            return;
        }

        this.itemIndex = -1;
        this.highlightItem(false);
    }

    onItemClick(e) {
        if (e.button !== 0) {
            return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        this.itemIndex = e.currentTarget.dataset.index;
        this.highlightItem();
        this.selectItem();
    }

    onItemMouseDown(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }

    renderLoading() {
        var renderedLoading = this.options.renderLoading();
        if (!renderedLoading) {
            return;
        }

        if (this.mentionContainer.getElementsByClassName('ql-mention-loading').length > 0) {
            this.showMentionList();
            return;
        }

        this.mentionList.innerHTML = '';
        let loadingDiv = document.createElement('div');
        loadingDiv.className = 'ql-mention-loading';
        loadingDiv.innerHTML = this.options.renderLoading();
        this.mentionContainer.append(loadingDiv);
        this.showMentionList();
    }

    removeLoading() {
        var loadingDiv = this.mentionContainer.getElementsByClassName('ql-mention-loading');
        if (loadingDiv.length > 0) {
            loadingDiv[0].remove();
        }
    }

    renderList(mentionChar, data, searchTerm) {
        if (data && data.length > 0) {
            this.removeLoading();

            this.values = data;
            this.mentionList.innerHTML = '';

            let initialSelection = -1;

            for (let i = 0; i < data.length; i += 1) {
                const li = document.createElement('li');
                li.role = 'presentation';
                li.className =
                    'lookup__item optionItem medium default uiAutocompleteOption forceChatterSelectMentionOption ' +
                    (this.options.listItemClass ? this.options.listItemClass : '');
                li.style = data[i].disabled ? 'color: lightgray; cursor: auto' : '';
                if (data[i].disabled) {
                    li.className += ' disabled';
                } else if (initialSelection === -1) {
                    initialSelection = i;
                }
                li.dataset.index = i;
                li.innerHTML = this.options.renderItem(data[i], searchTerm);
                li.dataset.value = li.innerHTML;
                if (!data[i].disabled) {
                    li.onmouseenter = this.onItemMouseEnter.bind(this);
                    li.onmouseup = this.onItemClick.bind(this);
                    li.onmousedown = this.onItemMouseDown.bind(this);
                } else {
                    li.onmouseenter = this.onDisabledItemMouseEnter.bind(this);
                }
                li.dataset.denotationChar = mentionChar;
                this.mentionList.appendChild(this.attachDataValues(li, data[i], this.options.dataAttributes));
            }
            this.itemIndex = initialSelection;
            this.highlightItem();
            this.showMentionList();
        } else {
            this.hideMentionList();
        }
    }

    nextItem() {
        var increment = 0;
        var newIndex;
        var disabled;
        this.oldIndex = this.itemIndex;
        do {
            increment++;
            newIndex = (this.itemIndex + increment) % this.values.length;
            disabled = this.mentionList.childNodes[newIndex].dataset.disabled === 'true';
            if (increment === this.values.length + 1) {
                //we've wrapped around w/o finding an enabled item
                newIndex = -1;
                break;
            }
        } while (disabled);

        this.itemIndex = newIndex;
        this.suspendMouseEnter = true;
        this.highlightItem();
    }

    prevItem() {
        var decrement = 0;
        var newIndex;
        var disabled;
        this.oldIndex = this.itemIndex;
        do {
            decrement++;
            newIndex = (this.itemIndex + this.values.length - decrement) % this.values.length;
            disabled = this.mentionList.childNodes[newIndex].dataset.disabled === 'true';
            if (decrement === this.values.length + 1) {
                //we've wrapped around w/o finding an enabled item
                newIndex = -1;
                break;
            }
        } while (disabled);

        this.itemIndex = newIndex;
        this.suspendMouseEnter = true;
        this.highlightItem();
    }

    containerBottomIsNotVisible(topPos, containerPos) {
        const mentionContainerBottom = topPos + this.mentionContainer.offsetHeight + containerPos.top;
        return mentionContainerBottom > window.pageYOffset + window.innerHeight;
    }

    containerRightIsNotVisible(leftPos, containerPos) {
        if (this.options.fixMentionsToQuill) {
            return false;
        }

        const rightPos = leftPos + this.mentionContainer.offsetWidth + containerPos.left;
        const browserWidth = window.pageXOffset + document.documentElement.clientWidth;
        return rightPos > browserWidth;
    }

    setIsOpen(isOpen) {
        if (this.isOpen !== isOpen) {
            if (isOpen) {
                this.options.onOpen();
            } else {
                this.options.onClose();
            }
            this.isOpen = isOpen;
        }
    }

    setMentionContainerPosition() {
        if (this.options.positioningStrategy === 'fixed') {
            this.setMentionContainerPosition_Fixed();
        } else {
            this.setMentionContainerPosition_Normal();
        }
    }

    setMentionContainerPosition_Normal() {
        const containerPos = this.quill.container.getBoundingClientRect();
        const mentionCharPos = this.quill.getBounds(this.mentionCharPos);
        const containerHeight = this.mentionContainer.offsetHeight;

        let topPos = this.options.offsetTop;
        let leftPos = this.options.offsetLeft;

        // handle horizontal positioning
        if (this.options.fixMentionsToQuill) {
            const rightPos = 0;
            this.mentionContainer.style.right = `${rightPos}px`;
        } else {
            leftPos += mentionCharPos.left;
        }

        if (this.containerRightIsNotVisible(leftPos, containerPos)) {
            const containerWidth = this.mentionContainer.offsetWidth + this.options.offsetLeft;
            const quillWidth = containerPos.width;
            leftPos = quillWidth - containerWidth;
        }

        // handle vertical positioning
        if (this.options.defaultMenuOrientation === 'top') {
            // Attempt to align the mention container with the top of the quill editor
            if (this.options.fixMentionsToQuill) {
                topPos = -1 * (containerHeight + this.options.offsetTop);
            } else {
                topPos = mentionCharPos.top - (containerHeight + this.options.offsetTop);
            }

            // default to bottom if the top is not visible
            if (topPos + containerPos.top <= 0) {
                let overMentionCharPos = this.options.offsetTop;

                if (this.options.fixMentionsToQuill) {
                    overMentionCharPos += containerPos.height;
                } else {
                    overMentionCharPos += mentionCharPos.bottom;
                }

                topPos = overMentionCharPos;
            }
        } else {
            // Attempt to align the mention container with the bottom of the quill editor
            if (this.options.fixMentionsToQuill) {
                topPos += containerPos.height;
            } else {
                topPos += mentionCharPos.bottom;
            }

            // default to the top if the bottom is not visible
            if (this.containerBottomIsNotVisible(topPos, containerPos)) {
                let overMentionCharPos = this.options.offsetTop * -1;

                if (!this.options.fixMentionsToQuill) {
                    overMentionCharPos += mentionCharPos.top;
                }

                topPos = overMentionCharPos - containerHeight;
            }
        }

        if (topPos >= 0) {
            this.options.mentionContainerClass.split(' ').forEach(className => {
                this.mentionContainer.classList.add(`${className}-bottom`);
                this.mentionContainer.classList.remove(`${className}-top`);
            });
        } else {
            this.options.mentionContainerClass.split(' ').forEach(className => {
                this.mentionContainer.classList.add(`${className}-top`);
                this.mentionContainer.classList.remove(`${className}-bottom`);
            });
        }

        this.mentionContainer.style.top = `${topPos}px`;
        this.mentionContainer.style.left = `${leftPos}px`;
        this.mentionContainer.style.visibility = 'visible';
    }

    setMentionContainerPosition_Fixed() {
        this.mentionContainer.style.position = 'fixed';
        this.mentionContainer.style.height = null;

        const containerPos = this.quill.container.getBoundingClientRect();
        const mentionCharPos = this.quill.getBounds(this.mentionCharPos);
        const mentionCharPosAbsolute = {
            left: containerPos.left + mentionCharPos.left,
            top: containerPos.top + mentionCharPos.top,
            width: 0,
            height: mentionCharPos.height
        };

        //Which rectangle should it be relative to
        const relativeToPos = this.options.fixMentionsToQuill ? containerPos : mentionCharPosAbsolute;

        let topPos = this.options.offsetTop;
        let leftPos = this.options.offsetLeft;

        // handle horizontal positioning
        if (this.options.fixMentionsToQuill) {
            const rightPos = relativeToPos.right;
            this.mentionContainer.style.right = `${rightPos}px`;
        } else {
            leftPos += relativeToPos.left;

            //if its off the righ edge, push it back
            if (leftPos + this.mentionContainer.offsetWidth > document.documentElement.clientWidth) {
                leftPos -= leftPos + this.mentionContainer.offsetWidth - document.documentElement.clientWidth;
            }
        }

        const availableSpaceTop = relativeToPos.top;
        const availableSpaceBottom = document.documentElement.clientHeight - (relativeToPos.top + relativeToPos.height);

        const fitsBottom = this.mentionContainer.offsetHeight <= availableSpaceBottom;
        const fitsTop = this.mentionContainer.offsetHeight <= availableSpaceTop;

        let placement;

        if (this.options.defaultMenuOrientation === 'top' && fitsTop) {
            placement = 'top';
        } else if (this.options.defaultMenuOrientation === 'bottom' && fitsBottom) {
            placement = 'bottom';
        } else {
            //it doesnt fit either so put it where there's the most space
            placement = availableSpaceBottom > availableSpaceTop ? 'bottom' : 'top';
        }

        if (placement === 'bottom') {
            topPos = relativeToPos.top + relativeToPos.height;
            if (!fitsBottom) {
                //shrink it to fit
                //3 is a bit of a fudge factor so it doesnt touch the edge of the screen
                this.mentionContainer.style.height = availableSpaceBottom - 3 + 'px';
            }

            this.options.mentionContainerClass.split(' ').forEach(className => {
                this.mentionContainer.classList.add(`${className}-bottom`);
                this.mentionContainer.classList.remove(`${className}-top`);
            });
        } else {
            topPos = relativeToPos.top - this.mentionContainer.offsetHeight;
            if (!fitsTop) {
                //shrink it to fit
                //3 is a bit of a fudge factor so it doesnt touch the edge of the screen
                this.mentionContainer.style.height = availableSpaceTop - 3 + 'px';
                topPos = 3;
            }

            this.options.mentionContainerClass.split(' ').forEach(className => {
                this.mentionContainer.classList.add(`${className}-top`);
                this.mentionContainer.classList.remove(`${className}-bottom`);
            });
        }

        this.mentionContainer.style.top = `${topPos}px`;
        this.mentionContainer.style.left = `${leftPos}px`;
        this.mentionContainer.style.visibility = 'visible';
    }

    getTextBeforeCursor() {
        const startPos = Math.max(0, this.cursorPos - this.options.maxChars);
        const textBeforeCursorPos = this.quill.getText(startPos, this.cursorPos - startPos);
        return textBeforeCursorPos;
    }

    onSomethingChange() {
        const range = this.quill.getSelection();
        if (range == null) return;

        this.cursorPos = range.index;
        const textBeforeCursor = this.getTextBeforeCursor();
        const { mentionChar, mentionCharIndex } = this.getMentionCharIndex(
            textBeforeCursor,
            this.options.mentionDenotationChars
        );

        if (this.hasValidMentionCharIndex(mentionCharIndex, textBeforeCursor, this.options.isolateCharacter)) {
            const mentionCharPos = this.cursorPos - (textBeforeCursor.length - mentionCharIndex);
            this.mentionCharPos = mentionCharPos;
            const textAfter = textBeforeCursor.substring(mentionCharIndex + mentionChar.length);
            if (
                textAfter.length >= this.options.minChars &&
                this.hasValidChars(textAfter, this.getAllowedCharsRegex(mentionChar))
            ) {
                if (this.existingSourceExecutionToken) {
                    this.existingSourceExecutionToken.abandoned = true;
                }
                this.renderLoading();
                let sourceRequestToken = {
                    abandoned: false
                };
                this.existingSourceExecutionToken = sourceRequestToken;
                this.options.source(
                    textAfter,
                    (data, searchTerm) => {
                        if (sourceRequestToken.abandoned) {
                            return;
                        }
                        this.existingSourceExecutionToken = null;
                        this.renderList(mentionChar, data, searchTerm);
                    },
                    mentionChar
                );
            } else {
                this.hideMentionList();
            }
        } else {
            this.hideMentionList();
        }
    }

    getAllowedCharsRegex(denotationChar) {
        return this.options.allowedChars instanceof RegExp
            ? this.options.allowedChars
            : this.options.allowedChars(denotationChar);
    }

    onTextChange(delta, oldDelta, source) {
        if (source === 'user') {
            this.onSomethingChange();
            this.dispatchEvent(
                new CustomEvent('edit', {
                    detail: {
                        text: this.text,
                        deltas: this.quill.editor.delta.ops
                    }
                })
            );
        }
    }

    onSelectionChange(range) {
        if (range && range.length === 0) {
            this.onSomethingChange();
        } else {
            this.hideMentionList();
        }
    }

    openMenu(denotationChar) {
        var selection = this.quill.getSelection(true);
        this.quill.insertText(selection.index, denotationChar);
        this.quill.blur();
        this.quill.focus();
    }

    // new LWC JS Code
    @api get text() {
        return this.quill.editor.delta.ops
            .map(x => ('string' == typeof x.insert ? x.insert : x.insert.mention.Id))
            .join('');
    }
    _text;
    set text(value) {
        this._text = value;
    }
}
