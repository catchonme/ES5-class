/** 依赖函数 */
var type = function (object) {
    var classType = Object.prototype.toString.call(object), type;
    switch (classType) {
        case '[object Null]': type = 'null';break;
        case '[object Undefined]': type = 'undefined';break;
        case '[object Number]': type = 'number';break;
        case '[object String]': type = 'string';break;
        case '[object Boolean]': type = 'boolean';break;
        case '[object Array]': type = 'array';break;
        case '[object Object]': type = 'object';break;
        case '[object Function]': type = 'function';break;
    }
    return type;
}

Function.prototype.overloadSetter = function(){
    var self = this;
    return function(a, b){
        if (a == null) return this;
        if (typeof a != 'string'){
            for (var k in a) self.call(this, k, a[k]);
        } else {
            self.call(this, a, b);
        }
        return this;
    };
};

Function.prototype.extend = function(key, value) {
    this[key] = value;
}.overloadSetter();

Function.prototype.implement = function(key, value) {
    this.prototype[key] = value;
}.overloadSetter();

Function.implement({
    hide: function() {
        this.$hidden = true;
        return this;
    },
    protect: function(){
        this.$protected = true;
        return this;
    }
});

var cloneOf = function(item) {
    switch(type(item)) {
        case 'array' : return item.clone();
        case 'object' : return Object.clone(item);
        default: return item;
    }
};

Array.implement('clone', function(){
    var i = this.length, clone = new Array(i);
    while(i--) clone[i] = cloneOf(this[i]);
    return clone;
});

var mergeOne = function(source, key, current) {
    switch (type(current)) {
        case 'object' :
            if (type(source[key]) == 'object') Object.merge(source[key], current);
            else source[key] = Object.clone(current);
            break;
        case 'array' :
            source[key] = current.clone();
            break;
        default : source[key] = current;
    }
    return source;
};

var extend = function(name, method) {
    if (method && method.$hidden) return;
    var previous = this[name];
    if (previous == null || !previous.$protected) this[name] = method;
};

Object.extend = extend.overloadSetter();
Object.extend({
    merge: function(source, k, v) {
        if (type(k) == 'string') return mergeOne(source, k, v);
        for (var i = 1, l = arguments.length; i < l; i++) {
            var object = arguments[i];
            for (var key in object) {
                mergeOne(source, key, object[key]);
            }
        }
        return source;
    },

    clone: function(object) {
        var clone = {};
        for (var key in object) clone[key] = cloneOf(object[key]);
        return clone;
    }
})

/** Class 主体 */
var Class = function(params) {
    var newClass = function () {
        // 初始化 newClass
        reset(this);
        // this.$caller 用来指代调用自身的函数
        this.$caller = null;
        // initialize 函数需要在使用 new 的时候执行，而不需要单独的调用才执行
        var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
        this.$caller = null;
        return value;
        // 使用extend 来将 newClass 和 Class 进行绑定
        // implement 来将所有初始设置的函数添加到 Class 的 prototype 中
    }.extend(this).implement(params);

    // 设置 newClass 的 parent，这样在函数中使用 this.parent(args) 调用父函数时，就可以调用这个函数了
    newClass.prototype.parent = parent;
    
    return newClass;
};

var parent = function() {
    if (!this.$caller) throw new Error('The method "parent" cannot be called');

    // 使用 this.parent(args) 调用父函数时，找到子类当前函数的名字，然后在父类中找到同名函数，并执行
    var name = this.$caller.$name,
        parent = this.$caller.$owner.parent,
        previous = (parent) ? parent.prototype[name] : null;
    
    if (!previous) throw new Error('The method "' + name + '" has no parent.');
    
    return previous.apply(this, arguments);
};

var reset = function(object) {
    for (var key in object) {
        var value = object[key];
        switch (type(value)) {
            case 'object' :
                var F = function(){};
                F.prototype = value;
                object[key] = reset(new F);
                break;
            case 'array' : 
                object[key] = value.clone(); 
                break;
        }
    }
    return object;
}

var implement = function (key, value, retain) {
    // 创建类时是否有 Extends/Implements ，判断是否需要把(伪)父类绑定到当前类中
    if (Class.Mutators.hasOwnProperty(key)) {
        value = Class.Mutators[key].call(this, value);
        if (value == null) return this;
    }

    // 把创建类中的属性和函数都赋给当前类的 prototype 中
    // Implements 时，retain 为 true，直接把伪父类的函数赋给伪子类的 prototype 中
    // Extends 时，retain 为 undefined，需要设置函数的 $caller 等属性
    // 属性都使用深复制赋给(伪)子类
    if (type(value) == 'function') {
        this.prototype[key] = (retain) ? value : wrap(this, key, value);
    } else {
        Object.merge(this.prototype, key, value)
    }
    
    return this;
}

// 使用 Extends 时，对父类函数做处理
// 使得子类函数中使用 this.parent(args) 可以调用到父函数中的同名函数
var wrap = function (self, key, method) {
    if (method.$origin) method = method.$origin;
    
    var wrapper = function () {
        if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');

        // 给函数绑定 $caller 属性
        var current = this.$caller;
        this.$caller = wrapper;
        var result = method.apply(this, arguments);
        this.$caller = current;
        
        return result;
        // 使用 extend 给函数加上 $owner/$origin/$name 属性
    }.extend({$owner: self, $origin: method, $name: key});
    
    return wrapper;
}

// 通过中间变量，把父类的属性和函数赋给子类
var getInstance = function(klass) {
    var proto = new klass;
    return proto;
}

// 给 Class 增加 implement 方法，这样就可以在新建 Class 的时候，
// 使用 implement 把参数中属性和函数添加到类的 prototype 中
Class.implement('implement', implement.overloadSetter());

// 类的两个拓展方法
// Extends 继承父类的属性和函数
// Implements 把伪父类的属性和函数添加到伪子类的 prototype 中，
// 此时不能使用 this.parent 来调用伪父类的同名函数
Class.Mutators = {
    Extends: function (parent) {
        this.parent = parent;
        this.prototype = getInstance(parent);
    },
    Implements: function (items) {
        var afterItems = [items];
        afterItems.forEach(function (item) {
            var instance = new item;
            for (var key in instance) {
                implement.call(this, key, instance[key], true)
            }
        }, this)
    }
};
