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

var UserDadata = function (object) {
    this.input = {};
    this.make_keys = {}
    this.flags = {};
    // Record the current name of the event form
    this.switch = '';


    for (var key in object) {
        if (object.hasOwnProperty(key)) {
            var element = object[key];
            switch (key) {
                case 'country':
                    // Validate Country. Russian default = 176
                    if (!this.countryValidate(element)) return;
                    break;

                case 'make_keys':
                    // References to the form name, address or all elements
                    this[key] = object[key];
                    break;

                case 'input':
                    // Create address or name... or may be all at once (input/textarea)
                    this.newItems(key, object[key]);
                    break;
                case 'reload':
                    this.reloadValue(object[key]);
                    break;
                // Custom callback is called in the changeState method
                case 'callback':
                    this.callback = object[key];
                    break;

                case 'insert':
                    // Send items to doom
                    this.insertItems(object[key]);
                    break;
                default:

                    if (typeof object[key] == 'string') {
                        this[key] = document.querySelector(object[key]);
                        break;
                    }

                    if (typeof object[key] == 'function') {
                        object[key](this);
                    }

            }
        }
    }
    //console.log(this)
}

UserDadata.prototype.reloadValue = function (obj) {
    var self = this;
    //console.log(obj)
    try {
        for (var key in obj) {
            var word = [];

            if (typeof obj[key] == 'string') {

                var localValue = localStorage.getItem(obj[key]);
                if (localValue) word.push(localValue);

            } else {

                if (typeof obj[key] == 'function') {
                    var Func = obj[key];

                    Func(self);
                    continue;
                }

                obj[key].forEach(function (name) {

                    if (typeof name == 'function') {
                        var Func = name;

                        Func(self);
                        return;
                    }

                    if (self[name].value) {
                        word.push(self[name].value);
                        //console.log(word)
                    }

                });

            }

            word = word.join(', ');

            if (key != 'address') {
                word = word.replace(/,/g, '');
            }

            self.input[key].querySelector('input, textarea').value = word;
        }
    } catch (e) {
        console.error(e);
    }

}

UserDadata.prototype.countryValidate = function (args) {
    if (typeof args == "boolean") {
        return true;
    }

    if (typeof args == 'object') {
        var element = document.querySelector(args[0]);
        if (element && element.value == args[1]) return true;
    }
    console.error('Country not selected Russian Federation')
    return false;
}

UserDadata.prototype.newItems = function (metod, object) {
    // References to the form name, address or all elements
    for (var name in object) {
        if (object.hasOwnProperty(name)) {
            var item = object[name];
            this[metod][name] = this.create(item[0], item[1], item[2]);
        }
    }
}

UserDadata.prototype.insertItems = function (object) {
    for (var key in object) {
        if (object.hasOwnProperty(key)) {
            //console.log(object[key])
            var array = object[key];
            var findElement = undefined, prevBlock = '';

            array.forEach(element => {
                var block = element[0],
                    name = element[1],
                    hide = element[2];

                if (!hide) {
                    hide = false;
                }

                if (prevBlock !== block) {
                    prevBlock = block;
                    findElement = document.querySelector(block);
                }
                if (!findElement) return;
                var EL = this.input[name].querySelector('input, textarea');

                var throttling = this.debounce(this.setEventsInput, 200);
                EL.addEventListener('input', throttling.bind(this), false);
                EL.addEventListener('focus', this.setEventsFocus.bind(this, name), false);
                EL.addEventListener('keydown', this.setEventsKeyUpKeyDown.bind(this), false);
                EL.nextElementSibling.addEventListener('click', this.setResultEvent.bind(this), false);

                switch (key) {
                    case 'before':
                        findElement.parentElement.insertBefore(this.input[name], findElement);
                        findElement.hidden = hide;
                        break;

                    case 'after':
                        findElement.parentElement.insertBefore(this.input[name], findElement.nextSibling);
                        findElement.hidden = hide;
                        break;

                    case 'append':
                        findElement.appendChild(this.input[name]);
                        break;

                    default:
                        console.error('No add method defined for new item this.input["' + name + '"]');
                }
            });
        }
    }
}

UserDadata.prototype.setEventsInput = function (event) {

    var query = event.target.value;
    if (event.data === ' ' /*|| event.data === null*/) return;
    var self = this;
    this.requestDadata(this.switch, query, function (data) {
        if (!data) return;
        // flag for the keypress event. This works when you switch to hide and vice versa.
        self.flags[self.switch] = {
            HEIGHT: 0,
            INDEX: -1,
            VALUE: query,
            DATA: data
        }

        var list = '';

        data.forEach((suggest, i) => {
            list += '<li class="child" data-index="' + i + '">' + suggest.value + '</li>';
        });
        //console.log(this.input[this.switch])
        self.input[self.switch].querySelector('.js_suggest').children[0].innerHTML = list;

    });
}

UserDadata.prototype.setEventsFocus = function (name) {
    // Switch the result of the previous block to hidden
    if (this.switch) {
        this.input[this.switch].querySelector('.js_suggest').hidden = true;
    }
    // Record the current name of the event form
    this.switch = name;

    var target = event.target.nextElementSibling;
    target.hidden = false;

}

UserDadata.prototype.setEventsKeyUpKeyDown = function () {
    if (event.keyCode != 40 && event.keyCode != 38 && event.keyCode != 13) return;

    var target = event.target.nextElementSibling;
    var items = target.getElementsByClassName('child');
    var count = items.length - 1;

    if (count < 0) return;

    var ELEMENT = event.target;
    var CHILDS = target.children[0];

    var VIEW = CHILDS.scrollHeight - CHILDS.getBoundingClientRect().height; // Get the height of the hidden part

    var h = this.flags[this.switch].HEIGHT;
    var i = this.flags[this.switch].INDEX;

    switch (event.keyCode) {
        case 13:
            event.preventDefault(); // Cancel newline event
            if (i < 0) break;
            this.flags[this.switch].VALUE = items[i].textContent;
            items[i].click();
            //event.target.blur();
            break;

        case 38:
            event.preventDefault(); // Cancel event move cursor to start

            i -= 1;
            if (VIEW > 0) {
                if (i >= 0) {
                    h -= items[i].getBoundingClientRect().height
                }

                CHILDS.scrollTop = h;
            }

            if (i < 0) {
                i = -1;
                items[0].classList.remove('selected');
                ELEMENT.value = this.flags[this.switch].VALUE;
            } else {
                if (i < count) items[i + 1].classList.remove('selected');
                items[i].classList.add('selected');
                ELEMENT.value = items[i].textContent;
            }

            break;

        case 40:
            i < count ? i++ : i;
            if (VIEW > 0 && h <= VIEW && i > 0) {
                h += items[i].getBoundingClientRect().height;
                CHILDS.scrollTop = h;
            }

            if (i > count) {
                i = count;
                items[i - 1].classList.remove('selected');

            } else {
                if (i > 0) items[i - 1].classList.remove('selected');
                items[i].classList.add('selected');
                ELEMENT.value = items[i].textContent;
            }

            break;
    }

    this.flags[this.switch].INDEX = i;
    this.flags[this.switch].HEIGHT = h;
}

UserDadata.prototype.findDadata = function (data) {
    return function (props) {

        if (typeof props == 'string') return data[props];
        if (typeof props == 'function') return props(data);

        var arr_1 = [];

        props.forEach(function (x) {
            //console.log(x, data.data[x])

            if (typeof x === 'string') {
                if (data.data.hasOwnProperty(x) && data.data[x]) {
                    arr_1.push(data.data[x]);
                }
                return;
            }

            var arr_2 = [];
            x.forEach(function (xx) {
                if (data.data.hasOwnProperty(xx) && data.data[xx]) {
                    arr_2.push(data.data[xx]);
                }
            })

            if (arr_2.length) {
                arr_1.push(arr_2.join(' '));
            }
        });

        if (arr_1.length) return arr_1.join(', ');

        return '';
    }

}

UserDadata.prototype.setResultEvent = function () {
    event.preventDefault();
    var target = event.target;
    var flag = this.switch;

    if (target.tagName === 'LI') {

        this.input[flag].querySelector('.js_suggest').hidden = true;
        this.input[flag].querySelector('input, textarea').value = target.textContent;

        var index = target.getAttribute('data-index');
        var thisValue = this.findDadata(this.flags[flag].DATA[index]);

        this.ChangeState(flag, thisValue);
    }
    if (target.tagName === 'BUTTON' || target.tagName === 'I') {
        this.input[flag].querySelector('.js_suggest').hidden = true;
    }
}

UserDadata.prototype.ChangeState = function (flag, thisValue) {

    var object = this.make_keys[flag];
    for (var key in object) {
        if (!object.hasOwnProperty(key)) continue;

        var element = object[key];

        if (this[key].type !== 'select-one') {
            this[key].value = thisValue(element);

            continue;
        }

        var region = thisValue(element).replace(/\s{0,1}[-\/].+/gi, '').toLowerCase();
        var selectOptions = this[key].options;

        var find = false;
        var i = selectOptions.length - 1;
        for (; i >= 0; i--) {
            //console.log(selectOptions[i].textContent.toLowerCase() + ' => ' + region)
            if (selectOptions[i].textContent.toLowerCase().search(region) < 0) continue;
            selectOptions[i].selected = find = true;
        }
        if (!find) selectOptions[0].selected = true;
    }

    if (this.callback) {
        var self = this;
        this.callback.forEach(function (Func) {
            Func(self, thisValue);
        })
    }

}

UserDadata.prototype.create = function (tag, props, child) {
    var element = document.createElement(tag);
    Object.keys(props).forEach(function (key) {
        element[key] = props[key]
    });
    if (child) {
        element.innerHTML = child;
    }
    return element;
}

UserDadata.prototype.requestDadata = function (param, query, callback) {
    var xhr = new XMLHttpRequest();
    param = '&name=' + param + '&suggest=' + encodeURIComponent(query);
    xhr.open('GET', 'index.php?route=extension/module/suggest_help/help_dadata' + param);
    //console.log(param)
    xhr.onload = function () {
        if (xhr.status === 200) {
            var json = JSON.parse(xhr.response);
            //console.log(json)
            callback(json.suggestions);
        } else {
            console.log(xhr.statusText);
            callback(false);
        }
    };

    xhr.onerror = function (error) {
        console.log(error);
        callback(false);
    };

    xhr.send();
}

UserDadata.prototype.debounce = function (f, ms) {
    var timer = null;
    return function (...args) {
        var onComplete = () => {
            f.apply(this, args);
            timer = null;
        }
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(onComplete, ms);
    };
}