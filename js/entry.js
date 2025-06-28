var entry = entry || (function() {
    var n;

    function newEntry() {
        main.userAction();
        nav.render("entry", {
            pageTitle: "New entry",
            title: "Untitled",
            content: "",
            knownTags: main.getKnownTags()
        });
        n = main.index().length;
        return Promise.resolve()
    }

    function editEntry(n_) {
        main.userAction();
        n = n_;
        var index = main.index()[n_];

        return davget(auth.entryUrl(n_)).then(body => {
            let content = auth.decrypt(body);

            if (content.split('<br>').length > 3) {
                // legacy HTML
                content = content
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/<br>\n/g, "  \n")
                    .replace(/<br>/g, "  \n")
            }

            nav.render("entry", {
                pageTitle: "Edit entry",
                title: index.title,
                tags: index.tags.join(", "),
                content: content,
                contentHtml: marked.parse(content),
                knownTags: main.getKnownTags()
            });
        });
    }

    function save() {
        main.userAction();
        var title = document.getElementsByClassName("entry_title__input")[0].value;
        var body = document.getElementsByClassName("entry_body__input")[0].value;
        var tags = document.getElementsByClassName("entry_tags__input")[0].value;
        if (title.trim() == '') {
            alert("Title cannot be empty");
            return;
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
        main.userAction();
        var body = document.getElementsByClassName("entry_body__input")[0].value;
        var preview = document.getElementsByClassName("entry_preview")[0];
        preview.innerHTML = marked.parse(body)
    }

    function addTag(s) {
        main.userAction();
        var tags = document.getElementsByClassName("entry_tags__input")[0].value;
        if (tags.length === 0) {
            tags = s
        } else {
            tags = tags + ", " + s
        }
        document.getElementsByClassName("entry_tags__input")[0].value = tags;
    }

    return {
        newEntry: newEntry,
        editEntry: editEntry,
        save: save,
        bodyChanged: bodyChanged,
        addTag: addTag
    }
})();