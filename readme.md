# jQuery Component Framework with two way bindings

- only __5.4 kB__ (minified)
- great functionality
- similar functionality as directives from Angularjs
- supports validation
- best of use with <www.totaljs.com> - web application framework for node.js
- [DEMO EXAMPLE](http://source.858project.com/jquery-jcomponent-demo.html)

```html
<script src="jcomponent.js"></script>
```

## All component methods/properties

```js
COMPONENT('input', function() {
    
    // make() === render
    this.make = function() {
        this.element.append('<input type="text" data-bind />');
    };

    // or
    // this.make = '<input type="text" data-bind />';
    
    // or
    // this.make = "/templates/input.html";

    // Is called after make()
    // OPTIONAL
    this.done = function() {

    };

    // OPTIONAL
    this.validate = function(value) {
        return value.length > 0;
    };
    
    // Watching all changes (all changes from all components) 
    this.watch = function(value, path) {
        
    };

    // Get a value from input/select/textarea
    // OPTIONAL, default declaration:
    this.getter = function(value) {
        // set value to model (by path name)
        this.set(value);
    };

    // Set a value to input/select/textarea
    // OPTIONAL, default declaration:
    this.setter = function(value) {
        this.element.find('input[data-bind],textarea[data-bind],select[data-bind]').val(value === undefined || value === null ? '' : value);
    };

    // Properties
    this.dirty; // Boolean
    this.valid; // Boolean

    // Methods
    this.get(); // get a value according to path from a model
    this.set(value); // set a value according to path into the model
});
```

## Global methods

```js
// [parameter] --> is OPTIONAL

$.components(); // --> component compiler (is called automatically)
$.components.dirty([value], [selector]); // --> are values dirty? or setter dirty value.
$.components.valid([value], [selector]); // --> are values valid? or setter valid value.
$.components.bind(path, value, [selector]); // --> bind value to model according to path
$.components.validate([path], [selector]); // --> validate values
$.components.reset([path], [selector]); // --> reset dirty, valid to default state (dirty=true,valid=true)
$.components.refresh([path], [selector]); // --> refresh setter
```

## Example

```js
COMPONENT('input', function() {
    this.make = '<input type="text" data-bind /><component type="label" path="' + this.element.attr('path') + '"></component>';
    this.validate = function(value) {
        return value.length > 0;
    };
});

COMPONENT('label', function() {    
    this.make = '<label></label>';
    this.setter = function(value) {
        this.element.find('label').html(value);
    };
});

COMPONENT('button', function() {    
    this.make = '<button disabled="true">' + this.element.text() + '</button>';
    this.watch = function() {
        this.element.find('button').prop({ disabled: $.components.dirty() && $.components.valid() });
    };
});
```

```html
<component type="input" path="model.name"></component>
<component type="button">SUBMIT</component>
<script>
    var model = {};
    model.name = 'Peter';
</script>
```