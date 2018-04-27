var Class = (function () {
    function subclass() {};
    function create() {
        var parent = null, properties = [].slice.call(arguments);
        // console.log(properties);return;
        if (isFunction(properties[0]))
            parent = properties.shift();

        function klass() {
            this.initialize.apply(this, arguments);
        }

        extend(klass, Class.Methods);
        klass.superclass = parent;
        klass.subclasses = [];

        if (parent) {
            subclass.prototype = parent.prototype;
            klass.prototype = new subclass;
            parent.subclasses.push(klass)
        }

        for (var i=0, length=properties.length; i<length; i++) {
            klass.addMethods(properties[i]);
        }

        if (!klass.prototype.initialize) {
            klass.prototype.initialize = emptyFunction
        }

        klass.prototype.constructor = klass;
        return klass
    }

    function addMethods(source) {
        var ancestor = this.superclass && this.superclass.prototype,
            properties = Object.keys(source);

        for (var i=0, length=properties.length; i<length; i++) {
            var property = properties[i], value = source[property];

            if (ancestor && isFunction(value)
                && value.argumentNames()[0] == "$super") {

                var method = value;
                // console.log(value);
                // 父类同名函数和子类同名函数分别执行
                // value 是一个函数
                value = (function (m) {
                    return function () {
                        return ancestor[m].apply(this, arguments);
                    }
                })(property).wrap(method);

                value.valueOf = (function (method) {
                    return function () {
                        return method.valueOf.call(method);
                    }
                })(method);

                value.toString = (function (method) {
                    return function () {
                        return method.toString.call(method);
                    }
                })(method);
            }

            this.prototype[property] = value;
        }
    }

    /* usage function */
    function isFunction(args) {
        return Object.prototype.toString.call(args) == '[object Function]'
    }

    var emptyFunction = function () {}

    Function.prototype.argumentNames = function() {
        var temp = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/);
        console.log(temp); // 看一下 match 的匹配
        var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
            .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g,'')
                .replace(/\s+/g, '').split(',');
        return names.length == 1 && !names[0] ? [] : names;
    }

    Function.prototype.wrap = function (wrapper) {
        var __method = this;
        return function () {
            var args = update([__method.bind(this)], arguments);
            return wrapper.apply(this, args);
        }
    }

    function update(array, args) {
        var arrayLength = array.length, length = args.length;
        while(length--) {
            array[arrayLength + length] = args[length];
        }
        return array;
    }

    function extend(destination, source) {
        for (var property in source)
            destination[property] = source[property];
        return destination;
    }

    return {
        create: create,
        Methods: {
            addMethods: addMethods
        }
    }
})();
/*
1. 如何判断子函数里面有 $super
 */