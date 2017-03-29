var index = index || (function() {

    function indexPage() {
        renderIndex(prepareIndex());

        return Promise.resolve();
    }

    function prepareIndex() {
        var i = main.index().slice();
        i.reverse();
        return i.filter(e => !e.deleted);
    }

    function renderIndex(index, tagFilter) {
        index = index.slice();

        index.forEach(e => {
            if (e.created == e.updated) {
                e.date = formatDate(e.created)
            } else {
                e.date = formatDate(e.created) + ", upd. " + formatDate(e.updated);
            }
        });

        nav.render("index", {index: index, alltags: main.getKnownTags(), tagFilter: tagFilter});
    }

    function showAll() {
        var button = document.getElementsByClassName('index_show-body')[0];
        var items = document.getElementsByClassName('index_item__body');
        var i = 0;

        button.disabled = true;

        runParallel(() => {
            if (i >= items.length) return false;

            var e = items[i];
            var n = items[i].getAttribute('data-n');
            i += 1;

            return davget(auth.entryUrl(n)).then(body => {
                e.innerHTML = auth.decrypt(body);
            });
        }, 10).catch(e => e).then(() => {
            button.disabled = false;
        });

    }

    function filterByTag(tag) {
        renderIndex(prepareIndex().filter(i => i.tags.indexOf(tag) >= 0), {tag: tag})
    }

    return {
        indexPage: indexPage,
        showAll: showAll,
        filterByTag: filterByTag
    }
})();