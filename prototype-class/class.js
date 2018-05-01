var Class = (function () {
    // subclass 作为一个中间变量，用来传递父类的属性和函数到子类
    // 每次新建 Class 的时候置为空函数
    function subclass() {};
    function create() {
        var parent = null, properties = [].slice.call(arguments);
        // prototype.js 继承的方式为创建类的第一个参数伪父类的名字
        // 所以这里判断第一个参数是否是函数，如果是，则他就是当前类的父类
        if (isFunction(properties[0]))
            parent = properties.shift();

        // 创建 klass ，执行 initialize 函数
        function klass() {
            this.initialize.apply(this, arguments);
        }

        // Class.Methods 的属性添加到 klass 中，这样 klass 就可以使用 addMethods 方法
        extend(klass, Class.Methods);
        klass.superclass = parent;
        klass.subclasses = [];

        // 存在父类的话，就把父类的属性和函数赋给 klass
        // 这里就是 subclass 中间变量的作用
        if (parent) {
            subclass.prototype = parent.prototype;
            klass.prototype = new subclass;
            parent.subclasses.push(klass)
        }

        // 通过 addMethods 方法，把创建类中函数添加到当前类中 prototype 中
        for (var i=0, length=properties.length; i<length; i++) {
            klass.addMethods(properties[i]);
        }

        // 创建类是没有 initialize 函数，就默认给 initialize 设置伪空函数
        if (!klass.prototype.initialize) {
            klass.prototype.initialize = emptyFunction
        }

        klass.prototype.constructor = klass;
        return klass
    }

    // 给类的 prototype 添加函数的方法
    function addMethods(source) {
        var ancestor = this.superclass && this.superclass.prototype,
            properties = Object.keys(source);

        for (var i=0, length=properties.length; i<length; i++) {
            var property = properties[i], value = source[property];

            // 如果在子类的函数中，第一个参数是 $super
            // prototype.js 中，$super 代表子类函数在调用时，父类同名函数也需要执行，也就是 prototype.js 实现继承父类的函数的方式
            if (ancestor && isFunction(value)
                && value.argumentNames()[0] == "$super") {

                var method = value;

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

    // 返回函数的第一个参数
    Function.prototype.argumentNames = function() {
        var temp = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/);

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