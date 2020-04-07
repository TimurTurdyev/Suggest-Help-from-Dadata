# Suggest Help from Dadata

Подсказки DaData в полях формы OpenCart. Написано на ES5, так что и в IE11 работает.
Запросы уходят в модуль магазина `index.php?route=extension/module/suggest_help/help_dadata`.

```html
<script src="catalog/view/javascript/suggest_help.js"></script>
<script>
  new DadataSuggest({
    // Подсказки включаются, только если выбрана эта страна. Можно не указывать.
    country: {select: '[name="country_id"]', value: '176'},

    // Что заполняем.
    fields: {
      region: '[name="zone_id"]',
      city: '[name="city"]',
      address: '[name="address_1"]',
      postcode: '[name="postcode"]'
    },

    blocks: {
      address: {
        // address, name, email, party. По умолчанию имя блока.
        type: 'address',
        // input и .js_suggest с ul.
        html: '<div class="form-group"><input type="text" class="form-control"><div class="js_suggest" hidden><ul></ul></div></div>',
        // before, after или append. hideTarget прячет старое поле.
        place: {before: '[name="address_1"]', hideTarget: true},
        // Начальный текст из fields или ключ localStorage строкой.
        prefill: ['region', 'city', 'address'],
        // 'value' - как есть, ['a', 'b'] - 'a, b', [['a', 'b']] - 'a b', или своя функция.
        fill: {
          region: ['region'],
          city: ['city_with_type'],
          address: ['street_with_type', ['house_type', 'house'], ['flat_type', 'flat']],
          postcode: ['postal_code']
        }
      }
    },

    // pick принимает то же, что fill.
    onSelect: function (pick, suggest, block) {
      console.log(block.name, pick('value'));
    }
  });
</script>
```
