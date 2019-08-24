'use strict';
/**======================================================================= *
 * =====================Suggest Help Dadata=============================== *
 * ======================================================================= *
 * = @license Commercial                                                 = *
 * = @author Pimur <borodatimur@gmail.com>                               = *
 * = @link https://opencartforum.com/profile/689478-pimur/               = *
 * = @site https://pimur.ru                                              = *
 * ======================================================================= *
 * =======================================================================**/

var KEY_ENTER = 13;
var KEY_UP = 38;
var KEY_DOWN = 40;

// Подсказки DaData для полей формы. Каждый блок - это поле ввода со своим выпадающим списком;
// выбранная подсказка раскладывается по полям формы из fields согласно fill.
function DadataSuggest(options) {
    this.fields = {};
    this.blocks = {};
    this.active = null;
    this.onSelect = options.onSelect || function () {};

    if (options.country && !this.isCountrySelected(options.country)) return;

    this.findFields(options.fields || {});

    var self = this;

    Object.keys(options.blocks || {}).forEach(function (name) {
        var block = self.createBlock(name, options.blocks[name]);

        if (block) {
            self.blocks[name] = block;
            self.bindBlock(block);
        }
    });
}

// country: {select: селектор списка стран, value: id страны}; подсказки работают только для нее.
DadataSuggest.prototype.isCountrySelected = function (country) {
    var select = document.querySelector(country.select);

    return !!select && select.value == country.value;
};

DadataSuggest.prototype.findFields = function (selectors) {
    var self = this;

    Object.keys(selectors).forEach(function (alias) {
        self.fields[alias] = document.querySelector(selectors[alias]);
    });
};

// Блок ставится рядом с элементом place: {before|after|append: селектор, hideTarget: спрятать этот элемент}.
DadataSuggest.prototype.createBlock = function (name, config) {
    var position = ['before', 'after', 'append'].filter(function (key) {
        return config.place && config.place[key];
    })[0];
    var target = position ? document.querySelector(config.place[position]) : null;

    if (!target) return null;

    var wrapper = document.createElement('div');
    wrapper.innerHTML = config.html;

    var element = wrapper.firstElementChild;

    if (position === 'append') {
        target.appendChild(element);
    } else {
        target.parentElement.insertBefore(element, position === 'before' ? target : target.nextSibling);
        target.hidden = !!config.place.hideTarget;
    }

    var block = {
        name: name,
        type: config.type || name,
        fill: config.fill || {},
        input: element.querySelector('input, textarea'),
        dropdown: element.querySelector('.js_suggest'),
        query: '',
        suggestions: [],
        index: -1
    };

    block.list = block.dropdown.querySelector('ul');
    block.input.value = this.prefillText(name, config.prefill);

    return block;
};

// prefill: ключ localStorage или список полей формы, из которых собирается начальный текст.
DadataSuggest.prototype.prefillText = function (name, prefill) {
    var self = this;

    if (!prefill) return '';

    if (typeof prefill === 'string') {
        return localStorage.getItem(prefill) || '';
    }

    var words = prefill.map(function (alias) {
        return self.fields[alias] ? self.fields[alias].value : '';
    }).filter(Boolean);

    return words.join(name === 'address' ? ', ' : ' ');
};

DadataSuggest.prototype.bindBlock = function (block) {
    var self = this;

    block.input.addEventListener('input', this.debounce(function () {
        self.search(block, block.input.value);
    }, 200), false);

    block.input.addEventListener('focus', function () {
        self.open(block);
    }, false);

    block.input.addEventListener('keydown', function (event) {
        self.handleKey(block, event);
    }, false);

    block.dropdown.addEventListener('click', function (event) {
        self.handleClick(block, event);
    }, false);
};

DadataSuggest.prototype.search = function (block, query) {
    var self = this;

    if (query.trim() === block.query.trim()) return;

    this.request(block.type, query, function (suggestions) {
        block.query = query;
        block.suggestions = suggestions;
        block.index = -1;
        self.render(block);
    });
};

DadataSuggest.prototype.render = function (block) {
    block.list.innerHTML = block.suggestions.map(function (suggest, index) {
        return '<li class="child" data-index="' + index + '">' + suggest.value + '</li>';
    }).join('');
    block.list.scrollTop = 0;
};

// Открытым может быть только один список: при фокусе на другом блоке прошлый прячется.
DadataSuggest.prototype.open = function (block) {
    if (this.active && this.active !== block) {
        this.close(this.active);
    }

    this.active = block;
    block.dropdown.hidden = false;
};

DadataSuggest.prototype.close = function (block) {
    block.dropdown.hidden = true;
};

DadataSuggest.prototype.handleKey = function (block, event) {
    if (!block.suggestions.length) return;

    switch (event.keyCode) {
        case KEY_DOWN:
            event.preventDefault();
            this.highlight(block, block.index + 1);
            break;
        case KEY_UP:
            event.preventDefault();
            this.highlight(block, block.index - 1);
            break;
        case KEY_ENTER:
            if (block.index < 0) return;
            event.preventDefault();
            this.choose(block, block.index);
            break;
    }
};

DadataSuggest.prototype.handleClick = function (block, event) {
    var target = event.target;

    if (target.tagName === 'LI') {
        this.choose(block, Number(target.getAttribute('data-index')));
    } else if (target.tagName === 'BUTTON' || target.tagName === 'I') {
        this.close(block);
    }
};

// index -1 снимает выделение и возвращает в поле то, что вводил пользователь.
DadataSuggest.prototype.highlight = function (block, index) {
    var items = block.list.children;

    index = Math.min(Math.max(index, -1), items.length - 1);

    if (items[block.index]) {
        items[block.index].classList.remove('selected');
    }

    block.index = index;

    if (index < 0) {
        block.input.value = block.query;
        return;
    }

    items[index].classList.add('selected');
    block.input.value = block.suggestions[index].value;
};

DadataSuggest.prototype.choose = function (block, index) {
    var suggest = block.suggestions[index];
    var pick = this.picker(suggest);

    this.close(block);
    block.input.value = suggest.value;
    block.query = suggest.value;

    this.fillFields(block.fill, pick);
    this.onSelect(pick, suggest, block);
};

// fill: {поле формы: что взять из подсказки}. Строка - поле подсказки целиком (value, unrestricted_value),
// массив - поля из data через ", ", вложенный массив - через пробел, функция - своя выборка.
DadataSuggest.prototype.picker = function (suggest) {
    var data = suggest.data || {};

    var field = function (key) {
        return data[key] || '';
    };

    return function pick(keys) {
        if (typeof keys === 'function') return keys(suggest);
        if (typeof keys === 'string') return suggest[keys] || '';

        return keys.map(function (key) {
            return Array.isArray(key) ? key.map(field).filter(Boolean).join(' ') : field(key);
        }).filter(Boolean).join(', ');
    };
};

DadataSuggest.prototype.fillFields = function (fill, pick) {
    var self = this;

    Object.keys(fill).forEach(function (alias) {
        var element = self.fields[alias];

        if (!element) return;

        if (element.tagName === 'SELECT') {
            self.selectByText(element, pick(fill[alias]));
        } else {
            element.value = pick(fill[alias]);
        }
    });
};

// Регион сравнивается с пунктами списка без хвоста вроде " - край" или "/Якутия"; не нашли - первый пункт.
DadataSuggest.prototype.selectByText = function (select, text) {
    var needle = text.replace(/\s?[-\/].+/g, '').toLowerCase();

    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].textContent.toLowerCase().indexOf(needle) !== -1) {
            select.selectedIndex = i;
            return;
        }
    }

    select.selectedIndex = 0;
};

DadataSuggest.prototype.request = function (type, query, onSuccess) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', 'index.php?route=extension/module/suggest_help/help_dadata'
        + '&name=' + encodeURIComponent(type)
        + '&suggest=' + encodeURIComponent(query));

    xhr.onload = function () {
        if (xhr.status !== 200) return;

        try {
            onSuccess(JSON.parse(xhr.responseText).suggestions || []);
        } catch (e) {
            console.error(e);
        }
    };

    xhr.send();
};

DadataSuggest.prototype.debounce = function (fn, ms) {
    var timer = null;

    return function () {
        clearTimeout(timer);
        timer = setTimeout(fn, ms);
    };
};
