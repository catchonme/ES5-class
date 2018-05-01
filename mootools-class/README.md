- `Mootools.js` `Class` 实现要点
    - 如何实现`Class` 
    - 子类如何继承父类的属性和函数
    - 子类继承父类的属性，修改后，不影响父类的属性
    - 子类为什么不会覆盖父类的同名函数
    - 如何实现不在类中，使用`implement`往类中添加方法
    - `Implements`如何将伪父类的属性和函数赋给伪子类

---
- 如何实现`Class`
> `Class`需要属性和函数，所以最适合的就是使用`function`，因为`function`可以在内部通过`this.name = name` 设置属性，通过`func.prototype.add = function(){}`来增加函数
- 子类如何继承父类的属性和函数
> 增加中间变量，`var proto = new Parent()` 实例化父类后，就可以将父类的属性和原型上的函数都赋给`proto`，然后遍历`proto`，赋给子函数（同时需要使用apply绑定子类的this），这样子类在调用该方法时，就能够获取子类自身上的属性
- 子类继承父类的属性，修改后，不影响父类的属性
> 父类的函数通过中间变量赋给子类后，不会影响父类的函数，父类的属性，则通过深复制赋给子类，这样在修改子类的同时，不会修改父类的属性
- 子类为什么不会覆盖父类的同名函数
> 使用`Extends`继承父类时，设置子类的`parent`是父类的名称，父类的所有函数都会赋给子类的`prototype`中，当子类与父类存在同名函数时，子类的该同名函数会覆盖掉原本父类中的同名函数。该同名函数中使用`this.parent(args)`后，会通过找到父类的该函数，使用`apply`绑定子类，执行一次，也就是子类同名函数执行一次，父类同名函数执行一次。

> 所以其实是子类会覆盖掉父类的同名函数
- 如何实现不在类中，使用`implement`往类中添加方法
> 其实就是往类的`prototype`添加函数
- `Implements`如何将伪父类的属性和函数赋给伪子类
> 遍历伪父类的所有属性，深复制给伪子类，遍历伪父类的所有函数，使用`call`绑定子类的`this`，赋给子类的`prototype`，这是因为没有设置子类的`parent`，所有在方法中不能使用`this.parent`来调用父类的同名函数，即伪子类如果与伪父类存在同名函数，那么伪子类会覆盖掉伪父类的同名函数