/**
 * 来源 mootools
 */

/* 依赖函数 */
Function.prototype.overloadSetter = function(usePlural){
    var self = this;
    return function(a, b){
        if (a == null) return this;
        if (usePlural || typeof a != 'string'){
            for (var k in a) self.call(this, k, a[k]);
        } else {
            self.call(this, a, b);
        }
        return this;
    };
};

Function.prototype.extend = function(key, value){
    this[key] = value;
}.overloadSetter();

Function.prototype.implement = function(key, value){
    this.prototype[key] = value;
}.overloadSetter();

Function.implement({

    hide: function(){
        this.$hidden = true;
        return this;
    },

    protect: function(){
        this.$protected = true;
        return this;
    }

});

var cloneOf = function(item){
    switch (typeof(item)){
        case 'array': return item.clone();
        case 'object': return Object.clone(item);
        default: return item;
    }
};

Array.implement('clone', function(){
    var i = this.length, clone = new Array(i);
    while (i--) clone[i] = cloneOf(this[i]);
    return clone;
});

var mergeOne = function(source, key, current){
    switch (typeof(current)){
        case 'object':
            if (typeof(source[key]) == 'object') Object.merge(source[key], current);
            else source[key] = Object.clone(current);
            break;
        case 'array': source[key] = current.clone(); break;
        default: source[key] = current;
    }
    return source;
};

var extend = function(name, method){
    if (method && method.$hidden) return;
    var previous = this[name];
    if (previous == null || !previous.$protected) this[name] = method;
};
Object.extend = extend.overloadSetter();
Object.extend({
    merge: function (source, k, v) {
        if (typeof(k) == 'string') return mergeOne(source, k, v);
        for (var i = 1, l = arguments.length; i < l; i++) {
            var object = arguments[i];
            for (var key in object) mergeOne(source, key, object[key]);
        }
        return source;
    },

    clone: function(object){
        var clone = {};
        for (var key in object) clone[key] = cloneOf(object[key]);
        return clone;
    },
})

/* class 主体 */
// 新建一个 Class 的类，new Type 也是一个函数
var Class = function(params){

    var newClass = function(){
        // 解除属性里对其他对象的引用
        reset(this);

        this.$caller = null;
        // 有初始化函数的话，就传入参数到该初始化函数并执行，没有就返回自身
        var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;

        console.log(this.$caller);
        this.$caller = null;
        return value;
        // 新生成的函数 newClass 与 this 绑定，
        // implement(params) 把 params 的所有方法都添加到当前类中
    }.extend(this).implement(params);

    // 指定当前类的父类是哪一个
    newClass.prototype.parent = parent;

    return newClass;
};

/*
	在子类拥有和父类同名方法时，使用 this.parent(args) 方法来调用父类的该方法
 */
var parent = function(){
    // 如果当前方法没有被调用，那么就说，parent 方法没有被调用
    // 子类在函数中使用 this.parent(args) ，但是父类没有这个函数的同名函数
    if (!this.$caller) throw new Error('The method "parent" cannot be called.');

    // console.log(this.$caller) // wrap 里面的 wrapper 函数
    // 当前函数被调用的名字 function person(age) { this.age = age }，则 age 被调用的就是 person 函数，就是得到 person 这个名字
    // console.log(this.$caller.$name); // 会打印出子类的名称
    var name = this.$caller.$name,
        // $owner 当前类对象, 得到当前类对象的父类对象
        parent = this.$caller.$owner.parent,
        // 得到父类相同名字的方法
        previous = (parent) ? parent.prototype[name] : null;
    // console.log(name)
    if (!previous) throw new Error('The method "' + name + '" has no parent.');
    // 父类的该同名函数，添加到当前子类中
    return previous.apply(this, arguments);
};

// 解除属性里对其他对象的引用
// 这个解除的例子，可以看 http://hmking.blog.51cto.com/3135992/675856
var reset = function(object){
    for (var key in object){
        var value = object[key];
        switch (typeof(value)){
            case 'object':
                var F = function(){};
                F.prototype = value;
                object[key] = reset(new F);
                break;
            case 'array': object[key] = value.clone(); break;
        }
    }
    return object;
};

// 这个函数是一定会用到的
var wrap = function(self, key, method){
    // console.log(key)
    if (method.$origin) method = method.$origin;
    var wrapper = function(){
        // 如果方法是是被保护的，或者这个方法没有 $caller ，就不能被调用
        if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');

        var current = this.$caller;

        if (this.$caller) {
            // console.log('this.$caller.$name is ' + this.$caller.$name || 'no name');
        }

        this.$caller = wrapper; // method 的 $caller
        // 将 method 绑定到当前对象中
        var result = method.apply(this, arguments);

        this.$caller = current; // wrapper 的 $caller
        return result;
        // 通过extend ,$owner, $origin, $name 加到 wrapper 函数的属性中去
        // 这样就能在 parent 中使用 this.$caller.$name，this.$caller.$owner.parent 中是使用了
    }.extend({$owner: self, $origin: method, $name: key});
    // console.log(wrapper.$owner)
    return wrapper;
};

var implement = function(key, value, retain){

    // 使用 Extends 继承时
    if (Class.Mutators.hasOwnProperty(key)){
        // console.log(key) // Extends
        // console.log(value) // newClass 函数
        value = Class.Mutators[key].call(this, value);
        if (value == null) {
            return this;
        }
    }

    // console.log('implement params ' + key)
    // console.log('implement params value ' + value)
    // this.prototype[key] = (retain) ? value : wrap(this, key, value);
    // console.log('retain is ' + retain || 'retain is undefined') // undefined

    /*
     Extends 继承的时候，retain 是 false ,所以 wrap 函数
     Implements 的时候，该函数为新函数的prototype
     */
    this.prototype[key] = (retain) ? value : wrap(this, key, value);

    return this;
};

// 为了将父类的的属性继承到子类，会使用中间变量，将父类传递给中间变量，再通过中间变量传递给子类
var getInstance = function(klass){

    var proto = new klass;
    return proto;
};

// 这里有 overloadSetter ，所以，可能是 Class.implement 方法，来给类额外添加函数的
Class.implement('implement', implement.overloadSetter());

Class.Mutators = {

    // 传给 extends 的参数是 parent
    Extends: function(parent){
        // 指向当前类的父类是 parent 参数
        this.parent = parent;
        // 使用 getInstance 得到父类的全部方法
        this.prototype = getInstance(parent);
    },
    Implements: function(items){
        var afterItems = [items];
        afterItems.forEach(function(item){
            var instance = new item;
            for (var key in instance) implement.call(this, key, instance[key], true);
        }, this);
    }
};



/*
 Extends 其实是分两部分，使用 Extends 的时候，是把父类的所有属性和方法，通过 getInstance 来附加到当前类中
 然后当前类的方法中，可以使用 this.parent(args) 方法，来把父类的同名方法加载进来

 Implements 方法中没有指代 this.parent = parent ，所以如果当前类写了和父类同名的方法，就会覆盖父类的方法
 Implements 只是给当前类添加更多的方法
 */