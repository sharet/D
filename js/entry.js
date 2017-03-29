var entry = entry || (function() {
    var n;
    var useHtmlMode;

    function newEntry() {
        useHtmlMode = false;
        nav.render("entry", {
            pageTitle: "New entry",
            title: "Untitled",
            content: "",
            knownTags: main.getKnownTags()
        });
        updateButtons();
        n = main.index().length;
        return Promise.resolve()
    }

    function editEntry(n_) {
        useHtmlMode = true;
        n = n_;
        var index = main.index()[n_];

        return davget(auth.entryUrl(n_)).then(body => {
            nav.render("entry", {
                pageTitle: "Edit entry",
                title: index.title,
                tags: index.tags.join(", "),
                content: auth.decrypt(body),
                knownTags: main.getKnownTags()
            });
            updateButtons();
        });
    }

    function save() {
        var title = document.getElementsByClassName("entry_title__input")[0].value;
        var body = document.getElementsByClassName("entry_body__input")[0].value;
        var tags = document.getElementsByClassName("entry_tags__input")[0].value;
        if (title.trim() == '') {
            alert("Title cannot be empty");
            return;
        }

        if (!useHtmlMode) {
            body = toHtml(body);
        }

        tags = tags.split(",").map(t => t.trim()).filter(t => t.length > 0);

        var button = document.getElementsByClassName('entry_save__button')[0];
        button.disabled = true;

        function doSave() {
            return main.writeEntry({
                title: title,
                tags: tags
            }, body, n)
                .then(() => {
                    button.disabled = false;
                    nav.go('/')
                })
                .catch(e => {
                    button.disabled = false;
                    console.log(e);
                    alert(e);
                });
        }

        if (n == main.index().length) {
            davget(auth.entryUrl(n)).then(() => {
                //entry already exists!
                    return main.loadIndex().then(() => {
                        n = main.index().length;
                        save();
                    }).catch(e => {
                        console.log(e);
                        alert(e);
                    });

            }).catch(() => {
                //entry is missing, proceed
                return doSave();
            }).catch(e => {
                console.log(e);
                alert(e);
            });
        } else {
            doSave().catch(e => {
                console.log(e);
                alert(e);
            });
        }
    }

    function bodyChanged() {
        var body = document.getElementsByClassName("entry_body__input")[0].value;
        var preview = document.getElementsByClassName("entry_preview")[0];
        if (useHtmlMode) {
            preview.innerHTML = body
        } else {
            preview.innerHTML = toHtml(body);
        }
    }

    function onP() {
        var f = document.getElementsByClassName('entry_body__input')[0];
        insertAtCursor(f, "<p>\n");
        bodyChanged();
    }

    function onPre() {
        var f = document.getElementsByClassName('entry_body__input')[0];
        insertAtCursor(f, "<pre>\n</pre>");
        bodyChanged();
    }

    function onHtmlMode() {
        var f = document.getElementsByClassName('entry_body__input')[0];
        f.value = toHtml(f.value);
        useHtmlMode = true;
        bodyChanged();
        updateButtons();
    }

    function onTxtMode() {
        var f = document.getElementsByClassName('entry_body__input')[0];
        f.value = toText(f.value);
        useHtmlMode = false;
        bodyChanged();
        updateButtons();
    }

    function toHtml(s) {
        return s
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>\n")
    }

    function toText(s) {
        return s
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/<br>\n/g, "\n")
            .replace(/<br>/g, "\n")
    }

    function insertAtCursor(myField, myValue) {
        //IE support
        if (document.selection) {
            myField.focus();
            var sel = document.selection.createRange();
            sel.text = myValue;
        }
        //MOZILLA and others
        else if (myField.selectionStart || myField.selectionStart == '0') {
            var startPos = myField.selectionStart;
            var endPos = myField.selectionEnd;
            myField.value = myField.value.substring(0, startPos)
                + myValue
                + myField.value.substring(endPos, myField.value.length);
            myField.selectionStart = startPos + myValue.length;
            myField.selectionEnd = startPos + myValue.length;
        } else {
            myField.value += myValue;
        }
    }


    function updateButtons() {
        document.getElementsByClassName('entry_toolbar_html')[0].disabled = useHtmlMode;
        document.getElementsByClassName('entry_toolbar_txt')[0].disabled = !useHtmlMode;
    }

    return {
        newEntry: newEntry,
        editEntry: editEntry,
        save: save,
        bodyChanged: bodyChanged,
        onP: onP,
        onPre: onPre,
        onHtmlMode: onHtmlMode,
        onTxtMode: onTxtMode
    }
})();