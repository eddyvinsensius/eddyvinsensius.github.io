
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function xlink_attr(node, attribute, value) {
        node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const swMenu = writable(0);

    /* src\Home.svelte generated by Svelte v3.38.2 */
    const file$6 = "src\\Home.svelte";

    function create_fragment$6(ctx) {
    	let div11;
    	let div0;
    	let button0;
    	let t0;
    	let button1;
    	let t1;
    	let button2;
    	let t2;
    	let div10;
    	let div3;
    	let img0;
    	let img0_src_value;
    	let t3;
    	let div2;
    	let div1;
    	let h10;
    	let t5;
    	let p0;
    	let t7;
    	let p1;
    	let a0;
    	let t9;
    	let div6;
    	let img1;
    	let img1_src_value;
    	let t10;
    	let div5;
    	let div4;
    	let h11;
    	let t12;
    	let p2;
    	let t14;
    	let p3;
    	let a1;
    	let t16;
    	let div9;
    	let img2;
    	let img2_src_value;
    	let t17;
    	let div8;
    	let div7;
    	let h12;
    	let t19;
    	let p4;
    	let t21;
    	let p5;
    	let a2;
    	let t23;
    	let button3;
    	let span0;
    	let t24;
    	let span1;
    	let t26;
    	let button4;
    	let span2;
    	let t27;
    	let span3;
    	let t29;
    	let div21;
    	let div14;
    	let div12;
    	let h20;
    	let t30;
    	let span4;
    	let t32;
    	let p6;
    	let t34;
    	let div13;
    	let svg0;
    	let title0;
    	let t35;
    	let rect0;
    	let text0;
    	let t36;
    	let t37;
    	let hr0;
    	let t38;
    	let div17;
    	let div15;
    	let h21;
    	let t39;
    	let span5;
    	let t41;
    	let p7;
    	let t43;
    	let div16;
    	let svg1;
    	let title1;
    	let t44;
    	let rect1;
    	let text1;
    	let t45;
    	let t46;
    	let hr1;
    	let t47;
    	let div20;
    	let div18;
    	let h22;
    	let t48;
    	let span6;
    	let t50;
    	let p8;
    	let t52;
    	let div19;
    	let svg2;
    	let title2;
    	let t53;
    	let rect2;
    	let text2;
    	let t54;
    	let t55;
    	let hr2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			t0 = space();
    			button1 = element("button");
    			t1 = space();
    			button2 = element("button");
    			t2 = space();
    			div10 = element("div");
    			div3 = element("div");
    			img0 = element("img");
    			t3 = space();
    			div2 = element("div");
    			div1 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Headline 01.";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit.\r\n                        Architecto tempore mollitia culpa.";
    			t7 = space();
    			p1 = element("p");
    			a0 = element("a");
    			a0.textContent = "Lihat Produk";
    			t9 = space();
    			div6 = element("div");
    			img1 = element("img");
    			t10 = space();
    			div5 = element("div");
    			div4 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Headline 02.";
    			t12 = space();
    			p2 = element("p");
    			p2.textContent = "corporis esse similique quibusdam, eveniet delectus\r\n                        dolorem aut. Ullam, ipsam voluptas.";
    			t14 = space();
    			p3 = element("p");
    			a1 = element("a");
    			a1.textContent = "Inquiry Barang";
    			t16 = space();
    			div9 = element("div");
    			img2 = element("img");
    			t17 = space();
    			div8 = element("div");
    			div7 = element("div");
    			h12 = element("h1");
    			h12.textContent = "Headline 03.";
    			t19 = space();
    			p4 = element("p");
    			p4.textContent = "Ullam, ipsam voluptas? Exercitationem, placeat deserunt.";
    			t21 = space();
    			p5 = element("p");
    			a2 = element("a");
    			a2.textContent = "Tentang Kami";
    			t23 = space();
    			button3 = element("button");
    			span0 = element("span");
    			t24 = space();
    			span1 = element("span");
    			span1.textContent = "Previous";
    			t26 = space();
    			button4 = element("button");
    			span2 = element("span");
    			t27 = space();
    			span3 = element("span");
    			span3.textContent = "Next";
    			t29 = space();
    			div21 = element("div");
    			div14 = element("div");
    			div12 = element("div");
    			h20 = element("h2");
    			t30 = text("News 01, ");
    			span4 = element("span");
    			span4.textContent = "Lorem ipsum dolor sit, amet consectetur";
    			t32 = space();
    			p6 = element("p");
    			p6.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit.\r\n                Accusamus deleniti, autem suscipit explicabo laborum assumenda\r\n                voluptas fuga sapiente beatae illo unde dolorum architecto\r\n                recusandae incidunt eligendi voluptates placeat facere\r\n                voluptatibus. Lorem ipsum dolor sit amet consectetur adipisicing\r\n                elit. Optio eius ad corporis saepe, molestiae minima qui,\r\n                molestias, aliquid quo ipsum quis magnam alias maiores deserunt\r\n                laboriosam rerum. Quaerat, culpa ullam!";
    			t34 = space();
    			div13 = element("div");
    			svg0 = svg_element("svg");
    			title0 = svg_element("title");
    			t35 = text("Placeholder");
    			rect0 = svg_element("rect");
    			text0 = svg_element("text");
    			t36 = text("500x500");
    			t37 = space();
    			hr0 = element("hr");
    			t38 = space();
    			div17 = element("div");
    			div15 = element("div");
    			h21 = element("h2");
    			t39 = text("News 02, ");
    			span5 = element("span");
    			span5.textContent = "Ipsa velit fugit exercitationem officia.";
    			t41 = space();
    			p7 = element("p");
    			p7.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa\r\n                velit fugit exercitationem officia recusandae cum architecto eum\r\n                explicabo, temporibus magnam veniam. Soluta dolor nihil tempore\r\n                dicta aspernatur magnam sapiente rerum? Lorem, ipsum dolor sit\r\n                amet consectetur adipisicing elit. Voluptate libero inventore\r\n                quisquam nisi, ab tenetur accusantium accusamus, autem odio\r\n                necessitatibus rem sint quia laborum, deserunt similique\r\n                exercitationem culpa. Quia, corrupti!";
    			t43 = space();
    			div16 = element("div");
    			svg1 = svg_element("svg");
    			title1 = svg_element("title");
    			t44 = text("Placeholder");
    			rect1 = svg_element("rect");
    			text1 = svg_element("text");
    			t45 = text("500x500");
    			t46 = space();
    			hr1 = element("hr");
    			t47 = space();
    			div20 = element("div");
    			div18 = element("div");
    			h22 = element("h2");
    			t48 = text("News 03, ");
    			span6 = element("span");
    			span6.textContent = "Magni deleniti quod similique consequuntur.";
    			t50 = space();
    			p8 = element("p");
    			p8.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Rem a\r\n                nisi sapiente, beatae cum aut obcaecati soluta, labore facere\r\n                nam voluptatibus, reprehenderit magni! Expedita vitae delectus\r\n                voluptas, totam nisi culpa? Lorem ipsum dolor sit amet\r\n                consectetur adipisicing elit. Magni deleniti quod similique\r\n                consequuntur, ipsam officia expedita dolorem soluta ipsum. Autem\r\n                omnis vel obcaecati accusantium hic at nisi ratione ad?\r\n                Quia!Lorem";
    			t52 = space();
    			div19 = element("div");
    			svg2 = svg_element("svg");
    			title2 = svg_element("title");
    			t53 = text("Placeholder");
    			rect2 = svg_element("rect");
    			text2 = svg_element("text");
    			t54 = text("500x500");
    			t55 = space();
    			hr2 = element("hr");
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "data-bs-target", "#myCarousel");
    			attr_dev(button0, "data-bs-slide-to", "0");
    			attr_dev(button0, "class", "active");
    			attr_dev(button0, "aria-current", "true");
    			attr_dev(button0, "aria-label", "Slide 1");
    			add_location(button0, file$6, 16, 8, 365);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-bs-target", "#myCarousel");
    			attr_dev(button1, "data-bs-slide-to", "1");
    			attr_dev(button1, "aria-label", "Slide 2");
    			add_location(button1, file$6, 24, 8, 592);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "data-bs-target", "#myCarousel");
    			attr_dev(button2, "data-bs-slide-to", "2");
    			attr_dev(button2, "aria-label", "Slide 3");
    			add_location(button2, file$6, 30, 8, 758);
    			attr_dev(div0, "class", "carousel-indicators");
    			add_location(div0, file$6, 15, 4, 322);
    			if (img0.src !== (img0_src_value = "img/xtra1.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "business_picture");
    			attr_dev(img0, "class", "img-fluid");
    			add_location(img0, file$6, 39, 12, 1051);
    			attr_dev(h10, "class", "text-secondary");
    			add_location(h10, file$6, 42, 20, 1237);
    			add_location(p0, file$6, 43, 20, 1303);
    			attr_dev(a0, "class", "btn btn-lg btn-primary");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$6, 48, 24, 1525);
    			add_location(p1, file$6, 47, 20, 1496);
    			attr_dev(div1, "class", "carousel-caption text-start");
    			add_location(div1, file$6, 41, 16, 1174);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$6, 40, 12, 1133);
    			attr_dev(div3, "class", "carousel-item active");
    			add_location(div3, file$6, 38, 8, 1003);
    			if (img1.src !== (img1_src_value = "img/xtra2.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "business_picture");
    			attr_dev(img1, "class", "img-fluid");
    			add_location(img1, file$6, 58, 12, 1857);
    			attr_dev(h11, "class", "text-black-50");
    			add_location(h11, file$6, 62, 20, 2034);
    			attr_dev(p2, "class", "text-secondary");
    			add_location(p2, file$6, 63, 20, 2099);
    			attr_dev(a1, "class", "btn btn-lg btn-primary");
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$6, 68, 24, 2340);
    			add_location(p3, file$6, 67, 20, 2311);
    			attr_dev(div4, "class", "carousel-caption");
    			add_location(div4, file$6, 61, 16, 1982);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$6, 60, 12, 1941);
    			attr_dev(div6, "class", "carousel-item");
    			add_location(div6, file$6, 57, 8, 1816);
    			if (img2.src !== (img2_src_value = "img/xtra3.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "business_picture");
    			attr_dev(img2, "class", "img-fluid");
    			add_location(img2, file$6, 78, 12, 2674);
    			attr_dev(h12, "class", "text-muted");
    			add_location(h12, file$6, 82, 20, 2860);
    			add_location(p4, file$6, 83, 20, 2922);
    			attr_dev(a2, "class", "btn btn-lg btn-primary");
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$6, 87, 24, 3084);
    			add_location(p5, file$6, 86, 20, 3055);
    			attr_dev(div7, "class", "carousel-caption text-end");
    			add_location(div7, file$6, 81, 16, 2799);
    			attr_dev(div8, "class", "container");
    			add_location(div8, file$6, 80, 12, 2758);
    			attr_dev(div9, "class", "carousel-item");
    			add_location(div9, file$6, 77, 8, 2633);
    			attr_dev(div10, "class", "carousel-inner");
    			set_style(div10, "width", "100%");
    			set_style(div10, "height", "450px");
    			add_location(div10, file$6, 37, 4, 932);
    			attr_dev(span0, "class", "carousel-control-prev-icon");
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$6, 103, 8, 3535);
    			attr_dev(span1, "class", "visually-hidden");
    			add_location(span1, file$6, 104, 8, 3607);
    			attr_dev(button3, "class", "carousel-control-prev");
    			attr_dev(button3, "type", "button");
    			attr_dev(button3, "data-bs-target", "#myCarousel");
    			attr_dev(button3, "data-bs-slide", "prev");
    			add_location(button3, file$6, 97, 4, 3381);
    			attr_dev(span2, "class", "carousel-control-next-icon");
    			attr_dev(span2, "aria-hidden", "true");
    			add_location(span2, file$6, 112, 8, 3827);
    			attr_dev(span3, "class", "visually-hidden");
    			add_location(span3, file$6, 113, 8, 3899);
    			attr_dev(button4, "class", "carousel-control-next");
    			attr_dev(button4, "type", "button");
    			attr_dev(button4, "data-bs-target", "#myCarousel");
    			attr_dev(button4, "data-bs-slide", "next");
    			add_location(button4, file$6, 106, 4, 3673);
    			attr_dev(div11, "id", "myCarousel");
    			attr_dev(div11, "class", "carousel slide");
    			attr_dev(div11, "data-bs-ride", "carousel");
    			add_location(div11, file$6, 14, 0, 248);
    			attr_dev(span4, "class", "text-muted");
    			add_location(span4, file$6, 125, 25, 4208);
    			attr_dev(h20, "class", "featurette-heading");
    			add_location(h20, file$6, 124, 12, 4150);
    			attr_dev(p6, "class", "lead");
    			add_location(p6, file$6, 129, 12, 4352);
    			attr_dev(div12, "class", "col-md-7");
    			add_location(div12, file$6, 123, 8, 4114);
    			add_location(title0, file$6, 150, 17, 5448);
    			attr_dev(rect0, "width", "100%");
    			attr_dev(rect0, "height", "100%");
    			attr_dev(rect0, "fill", "#eee");
    			add_location(rect0, file$6, 150, 43, 5474);
    			attr_dev(text0, "x", "50%");
    			attr_dev(text0, "y", "50%");
    			attr_dev(text0, "fill", "#aaa");
    			attr_dev(text0, "dy", ".3em");
    			add_location(text0, file$6, 154, 18, 5601);
    			attr_dev(svg0, "class", "bd-placeholder-img bd-placeholder-img-lg featurette-image img-fluid mx-auto");
    			attr_dev(svg0, "width", "500");
    			attr_dev(svg0, "height", "500");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "role", "img");
    			attr_dev(svg0, "aria-label", "Placeholder: 500x500");
    			attr_dev(svg0, "preserveAspectRatio", "xMidYMid slice");
    			attr_dev(svg0, "focusable", "false");
    			add_location(svg0, file$6, 141, 12, 5045);
    			attr_dev(div13, "class", "col-md-5");
    			add_location(div13, file$6, 140, 8, 5009);
    			attr_dev(div14, "class", "row featurette");
    			add_location(div14, file$6, 122, 4, 4076);
    			attr_dev(hr0, "class", "featurette-divider");
    			add_location(hr0, file$6, 160, 4, 5733);
    			attr_dev(span5, "class", "text-muted");
    			add_location(span5, file$6, 165, 25, 5917);
    			attr_dev(h21, "class", "featurette-heading");
    			add_location(h21, file$6, 164, 12, 5859);
    			attr_dev(p7, "class", "lead");
    			add_location(p7, file$6, 169, 12, 6062);
    			attr_dev(div15, "class", "col-md-7 order-md-2");
    			add_location(div15, file$6, 163, 8, 5812);
    			add_location(title1, file$6, 190, 17, 7179);
    			attr_dev(rect1, "width", "100%");
    			attr_dev(rect1, "height", "100%");
    			attr_dev(rect1, "fill", "#eee");
    			add_location(rect1, file$6, 190, 43, 7205);
    			attr_dev(text1, "x", "50%");
    			attr_dev(text1, "y", "50%");
    			attr_dev(text1, "fill", "#aaa");
    			attr_dev(text1, "dy", ".3em");
    			add_location(text1, file$6, 194, 18, 7332);
    			attr_dev(svg1, "class", "bd-placeholder-img bd-placeholder-img-lg featurette-image img-fluid mx-auto");
    			attr_dev(svg1, "width", "500");
    			attr_dev(svg1, "height", "500");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "role", "img");
    			attr_dev(svg1, "aria-label", "Placeholder: 500x500");
    			attr_dev(svg1, "preserveAspectRatio", "xMidYMid slice");
    			attr_dev(svg1, "focusable", "false");
    			add_location(svg1, file$6, 181, 12, 6776);
    			attr_dev(div16, "class", "col-md-5 order-md-1");
    			add_location(div16, file$6, 180, 8, 6729);
    			attr_dev(div17, "class", "row featurette");
    			add_location(div17, file$6, 162, 4, 5774);
    			attr_dev(hr1, "class", "featurette-divider");
    			add_location(hr1, file$6, 200, 4, 7464);
    			attr_dev(span6, "class", "text-muted");
    			add_location(span6, file$6, 205, 25, 7637);
    			attr_dev(h22, "class", "featurette-heading");
    			add_location(h22, file$6, 204, 12, 7579);
    			attr_dev(p8, "class", "lead");
    			add_location(p8, file$6, 209, 12, 7785);
    			attr_dev(div18, "class", "col-md-7");
    			add_location(div18, file$6, 203, 8, 7543);
    			add_location(title2, file$6, 230, 17, 8856);
    			attr_dev(rect2, "width", "100%");
    			attr_dev(rect2, "height", "100%");
    			attr_dev(rect2, "fill", "#eee");
    			add_location(rect2, file$6, 230, 43, 8882);
    			attr_dev(text2, "x", "50%");
    			attr_dev(text2, "y", "50%");
    			attr_dev(text2, "fill", "#aaa");
    			attr_dev(text2, "dy", ".3em");
    			add_location(text2, file$6, 234, 18, 9009);
    			attr_dev(svg2, "class", "bd-placeholder-img bd-placeholder-img-lg featurette-image img-fluid mx-auto");
    			attr_dev(svg2, "width", "500");
    			attr_dev(svg2, "height", "500");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "role", "img");
    			attr_dev(svg2, "aria-label", "Placeholder: 500x500");
    			attr_dev(svg2, "preserveAspectRatio", "xMidYMid slice");
    			attr_dev(svg2, "focusable", "false");
    			add_location(svg2, file$6, 221, 12, 8453);
    			attr_dev(div19, "class", "col-md-5");
    			add_location(div19, file$6, 220, 8, 8417);
    			attr_dev(div20, "class", "row featurette");
    			add_location(div20, file$6, 202, 4, 7505);
    			attr_dev(hr2, "class", "featurette-divider");
    			add_location(hr2, file$6, 240, 4, 9141);
    			attr_dev(div21, "class", "container");
    			add_location(div21, file$6, 121, 0, 4047);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t0);
    			append_dev(div0, button1);
    			append_dev(div0, t1);
    			append_dev(div0, button2);
    			append_dev(div11, t2);
    			append_dev(div11, div10);
    			append_dev(div10, div3);
    			append_dev(div3, img0);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h10);
    			append_dev(div1, t5);
    			append_dev(div1, p0);
    			append_dev(div1, t7);
    			append_dev(div1, p1);
    			append_dev(p1, a0);
    			append_dev(div10, t9);
    			append_dev(div10, div6);
    			append_dev(div6, img1);
    			append_dev(div6, t10);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, h11);
    			append_dev(div4, t12);
    			append_dev(div4, p2);
    			append_dev(div4, t14);
    			append_dev(div4, p3);
    			append_dev(p3, a1);
    			append_dev(div10, t16);
    			append_dev(div10, div9);
    			append_dev(div9, img2);
    			append_dev(div9, t17);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, h12);
    			append_dev(div7, t19);
    			append_dev(div7, p4);
    			append_dev(div7, t21);
    			append_dev(div7, p5);
    			append_dev(p5, a2);
    			append_dev(div11, t23);
    			append_dev(div11, button3);
    			append_dev(button3, span0);
    			append_dev(button3, t24);
    			append_dev(button3, span1);
    			append_dev(div11, t26);
    			append_dev(div11, button4);
    			append_dev(button4, span2);
    			append_dev(button4, t27);
    			append_dev(button4, span3);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, div21, anchor);
    			append_dev(div21, div14);
    			append_dev(div14, div12);
    			append_dev(div12, h20);
    			append_dev(h20, t30);
    			append_dev(h20, span4);
    			append_dev(div12, t32);
    			append_dev(div12, p6);
    			append_dev(div14, t34);
    			append_dev(div14, div13);
    			append_dev(div13, svg0);
    			append_dev(svg0, title0);
    			append_dev(title0, t35);
    			append_dev(svg0, rect0);
    			append_dev(svg0, text0);
    			append_dev(text0, t36);
    			append_dev(div21, t37);
    			append_dev(div21, hr0);
    			append_dev(div21, t38);
    			append_dev(div21, div17);
    			append_dev(div17, div15);
    			append_dev(div15, h21);
    			append_dev(h21, t39);
    			append_dev(h21, span5);
    			append_dev(div15, t41);
    			append_dev(div15, p7);
    			append_dev(div17, t43);
    			append_dev(div17, div16);
    			append_dev(div16, svg1);
    			append_dev(svg1, title1);
    			append_dev(title1, t44);
    			append_dev(svg1, rect1);
    			append_dev(svg1, text1);
    			append_dev(text1, t45);
    			append_dev(div21, t46);
    			append_dev(div21, hr1);
    			append_dev(div21, t47);
    			append_dev(div21, div20);
    			append_dev(div20, div18);
    			append_dev(div18, h22);
    			append_dev(h22, t48);
    			append_dev(h22, span6);
    			append_dev(div18, t50);
    			append_dev(div18, p8);
    			append_dev(div20, t52);
    			append_dev(div20, div19);
    			append_dev(div19, svg2);
    			append_dev(svg2, title2);
    			append_dev(title2, t53);
    			append_dev(svg2, rect2);
    			append_dev(svg2, text2);
    			append_dev(text2, t54);
    			append_dev(div21, t55);
    			append_dev(div21, hr2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", /*menuProduct*/ ctx[0], false, false, false),
    					listen_dev(a1, "click", /*menuInquiry*/ ctx[1], false, false, false),
    					listen_dev(a2, "click", /*menuAbout*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    			if (detaching) detach_dev(t29);
    			if (detaching) detach_dev(div21);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);

    	function menuProduct() {
    		swMenu.set(1);
    	}

    	function menuInquiry() {
    		swMenu.set(2);
    	}

    	function menuAbout() {
    		swMenu.set(3);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		swMenu,
    		menuProduct,
    		menuInquiry,
    		menuAbout
    	});

    	return [menuProduct, menuInquiry, menuAbout];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\SvgPic.svelte generated by Svelte v3.38.2 */

    const file$5 = "src\\SvgPic.svelte";

    function create_fragment$5(ctx) {
    	let svg;
    	let symbol0;
    	let title;
    	let t;
    	let path0;
    	let symbol1;
    	let path1;
    	let symbol2;
    	let path2;
    	let path3;
    	let symbol3;
    	let path4;
    	let symbol4;
    	let path5;
    	let path6;
    	let symbol5;
    	let path7;
    	let symbol6;
    	let path8;
    	let symbol7;
    	let path9;
    	let path10;
    	let symbol8;
    	let path11;
    	let symbol9;
    	let path12;
    	let path13;
    	let symbol10;
    	let path14;
    	let symbol11;
    	let path15;
    	let path16;
    	let symbol12;
    	let path17;
    	let path18;
    	let path19;
    	let symbol13;
    	let path20;
    	let symbol14;
    	let path21;
    	let symbol15;
    	let path22;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			symbol0 = svg_element("symbol");
    			title = svg_element("title");
    			t = text("Bootstrap");
    			path0 = svg_element("path");
    			symbol1 = svg_element("symbol");
    			path1 = svg_element("path");
    			symbol2 = svg_element("symbol");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			symbol3 = svg_element("symbol");
    			path4 = svg_element("path");
    			symbol4 = svg_element("symbol");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			symbol5 = svg_element("symbol");
    			path7 = svg_element("path");
    			symbol6 = svg_element("symbol");
    			path8 = svg_element("path");
    			symbol7 = svg_element("symbol");
    			path9 = svg_element("path");
    			path10 = svg_element("path");
    			symbol8 = svg_element("symbol");
    			path11 = svg_element("path");
    			symbol9 = svg_element("symbol");
    			path12 = svg_element("path");
    			path13 = svg_element("path");
    			symbol10 = svg_element("symbol");
    			path14 = svg_element("path");
    			symbol11 = svg_element("symbol");
    			path15 = svg_element("path");
    			path16 = svg_element("path");
    			symbol12 = svg_element("symbol");
    			path17 = svg_element("path");
    			path18 = svg_element("path");
    			path19 = svg_element("path");
    			symbol13 = svg_element("symbol");
    			path20 = svg_element("path");
    			symbol14 = svg_element("symbol");
    			path21 = svg_element("path");
    			symbol15 = svg_element("symbol");
    			path22 = svg_element("path");
    			add_location(title, file$5, 2, 8, 123);
    			attr_dev(path0, "fill-rule", "evenodd");
    			attr_dev(path0, "clip-rule", "evenodd");
    			attr_dev(path0, "d", "M24.509 0c-6.733 0-11.715 5.893-11.492 12.284.214 6.14-.064 14.092-2.066 20.577C8.943 39.365 5.547 43.485 0 44.014v5.972c5.547.529 8.943 4.649 10.951 11.153 2.002 6.485 2.28 14.437 2.066 20.577C12.794 88.106 17.776 94 24.51 94H93.5c6.733 0 11.714-5.893 11.491-12.284-.214-6.14.064-14.092 2.066-20.577 2.009-6.504 5.396-10.624 10.943-11.153v-5.972c-5.547-.529-8.934-4.649-10.943-11.153-2.002-6.484-2.28-14.437-2.066-20.577C105.214 5.894 100.233 0 93.5 0H24.508zM80 57.863C80 66.663 73.436 72 62.543 72H44a2 2 0 01-2-2V24a2 2 0 012-2h18.437c9.083 0 15.044 4.92 15.044 12.474 0 5.302-4.01 10.049-9.119 10.88v.277C75.317 46.394 80 51.21 80 57.863zM60.521 28.34H49.948v14.934h8.905c6.884 0 10.68-2.772 10.68-7.727 0-4.643-3.264-7.207-9.012-7.207zM49.948 49.2v16.458H60.91c7.167 0 10.964-2.876 10.964-8.281 0-5.406-3.903-8.178-11.425-8.178H49.948z");
    			add_location(path0, file$5, 3, 8, 157);
    			attr_dev(symbol0, "id", "bootstrap");
    			attr_dev(symbol0, "viewBox", "0 0 118 94");
    			add_location(symbol0, file$5, 1, 4, 69);
    			attr_dev(path1, "d", "M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z");
    			add_location(path1, file$5, 10, 8, 1168);
    			attr_dev(symbol1, "id", "home");
    			attr_dev(symbol1, "viewBox", "0 0 16 16");
    			add_location(symbol1, file$5, 9, 4, 1120);
    			attr_dev(path2, "d", "M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4zM3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.389.389 0 0 0-.029-.518z");
    			add_location(path2, file$5, 15, 8, 1589);
    			attr_dev(path3, "fill-rule", "evenodd");
    			attr_dev(path3, "d", "M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A7.988 7.988 0 0 1 0 10zm8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3z");
    			add_location(path3, file$5, 18, 8, 2016);
    			attr_dev(symbol2, "id", "speedometer2");
    			attr_dev(symbol2, "viewBox", "0 0 16 16");
    			add_location(symbol2, file$5, 14, 4, 1533);
    			attr_dev(path4, "d", "M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z");
    			add_location(path4, file$5, 24, 8, 2469);
    			attr_dev(symbol3, "id", "table");
    			attr_dev(symbol3, "viewBox", "0 0 16 16");
    			add_location(symbol3, file$5, 23, 4, 2420);
    			attr_dev(path5, "d", "M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z");
    			add_location(path5, file$5, 29, 8, 2808);
    			attr_dev(path6, "fill-rule", "evenodd");
    			attr_dev(path6, "d", "M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z");
    			add_location(path6, file$5, 30, 8, 2865);
    			attr_dev(symbol4, "id", "people-circle");
    			attr_dev(symbol4, "viewBox", "0 0 16 16");
    			add_location(symbol4, file$5, 28, 4, 2751);
    			attr_dev(path7, "d", "M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z");
    			add_location(path7, file$5, 36, 8, 3127);
    			attr_dev(symbol5, "id", "grid");
    			attr_dev(symbol5, "viewBox", "0 0 16 16");
    			add_location(symbol5, file$5, 35, 4, 3079);
    			attr_dev(path8, "d", "M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 13a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 16 13V6a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 0 6v7zm1.5.5A.5.5 0 0 1 1 13V6a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-13z");
    			add_location(path8, file$5, 41, 8, 3973);
    			attr_dev(symbol6, "id", "collection");
    			attr_dev(symbol6, "viewBox", "0 0 16 16");
    			add_location(symbol6, file$5, 40, 4, 3919);
    			attr_dev(path9, "d", "M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857V3.857z");
    			add_location(path9, file$5, 46, 8, 4350);
    			attr_dev(path10, "d", "M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z");
    			add_location(path10, file$5, 49, 8, 4580);
    			attr_dev(symbol7, "id", "calendar3");
    			attr_dev(symbol7, "viewBox", "0 0 16 16");
    			add_location(symbol7, file$5, 45, 4, 4297);
    			attr_dev(path11, "d", "M16 8c0 3.866-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.584.296-1.925.864-4.181 1.234-.2.032-.352-.176-.273-.362.354-.836.674-1.95.77-2.966C.744 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7zM7.194 6.766a1.688 1.688 0 0 0-.227-.272 1.467 1.467 0 0 0-.469-.324l-.008-.004A1.785 1.785 0 0 0 5.734 6C4.776 6 4 6.746 4 7.667c0 .92.776 1.666 1.734 1.666.343 0 .662-.095.931-.26-.137.389-.39.804-.81 1.22a.405.405 0 0 0 .011.59c.173.16.447.155.614-.01 1.334-1.329 1.37-2.758.941-3.706a2.461 2.461 0 0 0-.227-.4zM11 9.073c-.136.389-.39.804-.81 1.22a.405.405 0 0 0 .012.59c.172.16.446.155.613-.01 1.334-1.329 1.37-2.758.942-3.706a2.466 2.466 0 0 0-.228-.4 1.686 1.686 0 0 0-.227-.273 1.466 1.466 0 0 0-.469-.324l-.008-.004A1.785 1.785 0 0 0 10.07 6c-.957 0-1.734.746-1.734 1.667 0 .92.777 1.666 1.734 1.666.343 0 .662-.095.931-.26z");
    			add_location(path11, file$5, 54, 8, 5029);
    			attr_dev(symbol8, "id", "chat-quote-fill");
    			attr_dev(symbol8, "viewBox", "0 0 16 16");
    			add_location(symbol8, file$5, 53, 4, 4970);
    			attr_dev(path12, "d", "M6.5 6a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z");
    			add_location(path12, file$5, 59, 8, 5962);
    			attr_dev(path13, "d", "M5.5.5a.5.5 0 0 0-1 0V2A2.5 2.5 0 0 0 2 4.5H.5a.5.5 0 0 0 0 1H2v1H.5a.5.5 0 0 0 0 1H2v1H.5a.5.5 0 0 0 0 1H2v1H.5a.5.5 0 0 0 0 1H2A2.5 2.5 0 0 0 4.5 14v1.5a.5.5 0 0 0 1 0V14h1v1.5a.5.5 0 0 0 1 0V14h1v1.5a.5.5 0 0 0 1 0V14h1v1.5a.5.5 0 0 0 1 0V14a2.5 2.5 0 0 0 2.5-2.5h1.5a.5.5 0 0 0 0-1H14v-1h1.5a.5.5 0 0 0 0-1H14v-1h1.5a.5.5 0 0 0 0-1H14v-1h1.5a.5.5 0 0 0 0-1H14A2.5 2.5 0 0 0 11.5 2V.5a.5.5 0 0 0-1 0V2h-1V.5a.5.5 0 0 0-1 0V2h-1V.5a.5.5 0 0 0-1 0V2h-1V.5zm1 4.5h3A1.5 1.5 0 0 1 11 6.5v3A1.5 1.5 0 0 1 9.5 11h-3A1.5 1.5 0 0 1 5 9.5v-3A1.5 1.5 0 0 1 6.5 5z");
    			add_location(path13, file$5, 62, 8, 6090);
    			attr_dev(symbol9, "id", "cpu-fill");
    			attr_dev(symbol9, "viewBox", "0 0 16 16");
    			add_location(symbol9, file$5, 58, 4, 5910);
    			attr_dev(path14, "d", "M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z");
    			add_location(path14, file$5, 67, 8, 6755);
    			attr_dev(symbol10, "id", "gear-fill");
    			attr_dev(symbol10, "viewBox", "0 0 16 16");
    			add_location(symbol10, file$5, 66, 4, 6702);
    			attr_dev(path15, "d", "M8 2a.5.5 0 0 1 .5.5V4a.5.5 0 0 1-1 0V2.5A.5.5 0 0 1 8 2zM3.732 3.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 8a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 8zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 7.31A.91.91 0 1 0 8.85 8.569l3.434-4.297a.389.389 0 0 0-.029-.518z");
    			add_location(path15, file$5, 72, 8, 7536);
    			attr_dev(path16, "fill-rule", "evenodd");
    			attr_dev(path16, "d", "M6.664 15.889A8 8 0 1 1 9.336.11a8 8 0 0 1-2.672 15.78zm-4.665-4.283A11.945 11.945 0 0 1 8 10c2.186 0 4.236.585 6.001 1.606a7 7 0 1 0-12.002 0z");
    			add_location(path16, file$5, 75, 8, 7960);
    			attr_dev(symbol11, "id", "speedometer");
    			attr_dev(symbol11, "viewBox", "0 0 16 16");
    			add_location(symbol11, file$5, 71, 4, 7481);
    			attr_dev(path17, "d", "M9.465 10H12a2 2 0 1 1 0 4H9.465c.34-.588.535-1.271.535-2 0-.729-.195-1.412-.535-2z");
    			add_location(path17, file$5, 81, 8, 8244);
    			attr_dev(path18, "d", "M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm.535-10a3.975 3.975 0 0 1-.409-1H4a1 1 0 0 1 0-2h2.126c.091-.355.23-.69.41-1H4a2 2 0 1 0 0 4h2.535z");
    			add_location(path18, file$5, 84, 8, 8372);
    			attr_dev(path19, "d", "M14 4a4 4 0 1 1-8 0 4 4 0 0 1 8 0z");
    			add_location(path19, file$5, 87, 8, 8584);
    			attr_dev(symbol12, "id", "toggles2");
    			attr_dev(symbol12, "viewBox", "0 0 16 16");
    			add_location(symbol12, file$5, 80, 4, 8192);
    			attr_dev(path20, "d", "M1 0L0 1l2.2 3.081a1 1 0 0 0 .815.419h.07a1 1 0 0 1 .708.293l2.675 2.675-2.617 2.654A3.003 3.003 0 0 0 0 13a3 3 0 1 0 5.878-.851l2.654-2.617.968.968-.305.914a1 1 0 0 0 .242 1.023l3.356 3.356a1 1 0 0 0 1.414 0l1.586-1.586a1 1 0 0 0 0-1.414l-3.356-3.356a1 1 0 0 0-1.023-.242L10.5 9.5l-.96-.96 2.68-2.643A3.005 3.005 0 0 0 16 3c0-.269-.035-.53-.102-.777l-2.14 2.141L12 4l-.364-1.757L13.777.102a3 3 0 0 0-3.675 3.68L7.462 6.46 4.793 3.793a1 1 0 0 1-.293-.707v-.071a1 1 0 0 0-.419-.814L1 0zm9.646 10.646a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708zM3 11l.471.242.529.026.287.445.445.287.026.529L5 13l-.242.471-.026.529-.445.287-.287.445-.529.026L3 15l-.471-.242L2 14.732l-.287-.445L1.268 14l-.026-.529L1 13l.242-.471.026-.529.445-.287.287-.445.529-.026L3 11z");
    			add_location(path20, file$5, 90, 8, 8701);
    			attr_dev(symbol13, "id", "tools");
    			attr_dev(symbol13, "viewBox", "0 0 16 16");
    			add_location(symbol13, file$5, 89, 4, 8652);
    			attr_dev(path21, "fill-rule", "evenodd");
    			attr_dev(path21, "d", "M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z");
    			add_location(path21, file$5, 95, 8, 9588);
    			attr_dev(symbol14, "id", "chevron-right");
    			attr_dev(symbol14, "viewBox", "0 0 16 16");
    			add_location(symbol14, file$5, 94, 4, 9531);
    			attr_dev(path22, "fill-rule", "evenodd");
    			attr_dev(path22, "d", "M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999zm2.493 8.574a.5.5 0 0 1-.411.575c-.712.118-1.28.295-1.655.493a1.319 1.319 0 0 0-.37.265.301.301 0 0 0-.057.09V14l.002.008a.147.147 0 0 0 .016.033.617.617 0 0 0 .145.15c.165.13.435.27.813.395.751.25 1.82.414 3.024.414s2.273-.163 3.024-.414c.378-.126.648-.265.813-.395a.619.619 0 0 0 .146-.15.148.148 0 0 0 .015-.033L12 14v-.004a.301.301 0 0 0-.057-.09 1.318 1.318 0 0 0-.37-.264c-.376-.198-.943-.375-1.655-.493a.5.5 0 1 1 .164-.986c.77.127 1.452.328 1.957.594C12.5 13 13 13.4 13 14c0 .426-.26.752-.544.977-.29.228-.68.413-1.116.558-.878.293-2.059.465-3.34.465-1.281 0-2.462-.172-3.34-.465-.436-.145-.826-.33-1.116-.558C3.26 14.752 3 14.426 3 14c0-.599.5-1 .961-1.243.505-.266 1.187-.467 1.957-.594a.5.5 0 0 1 .575.411z");
    			add_location(path22, file$5, 101, 8, 9847);
    			attr_dev(symbol15, "id", "geo-fill");
    			attr_dev(symbol15, "viewBox", "0 0 16 16");
    			add_location(symbol15, file$5, 100, 4, 9795);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			set_style(svg, "display", "none");
    			add_location(svg, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, symbol0);
    			append_dev(symbol0, title);
    			append_dev(title, t);
    			append_dev(symbol0, path0);
    			append_dev(svg, symbol1);
    			append_dev(symbol1, path1);
    			append_dev(svg, symbol2);
    			append_dev(symbol2, path2);
    			append_dev(symbol2, path3);
    			append_dev(svg, symbol3);
    			append_dev(symbol3, path4);
    			append_dev(svg, symbol4);
    			append_dev(symbol4, path5);
    			append_dev(symbol4, path6);
    			append_dev(svg, symbol5);
    			append_dev(symbol5, path7);
    			append_dev(svg, symbol6);
    			append_dev(symbol6, path8);
    			append_dev(svg, symbol7);
    			append_dev(symbol7, path9);
    			append_dev(symbol7, path10);
    			append_dev(svg, symbol8);
    			append_dev(symbol8, path11);
    			append_dev(svg, symbol9);
    			append_dev(symbol9, path12);
    			append_dev(symbol9, path13);
    			append_dev(svg, symbol10);
    			append_dev(symbol10, path14);
    			append_dev(svg, symbol11);
    			append_dev(symbol11, path15);
    			append_dev(symbol11, path16);
    			append_dev(svg, symbol12);
    			append_dev(symbol12, path17);
    			append_dev(symbol12, path18);
    			append_dev(symbol12, path19);
    			append_dev(svg, symbol13);
    			append_dev(symbol13, path20);
    			append_dev(svg, symbol14);
    			append_dev(symbol14, path21);
    			append_dev(svg, symbol15);
    			append_dev(symbol15, path22);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SvgPic", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SvgPic> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class SvgPic extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SvgPic",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\Product.svelte generated by Svelte v3.38.2 */
    const file$4 = "src\\Product.svelte";

    function create_fragment$4(ctx) {
    	let svgpic;
    	let t0;
    	let div7;
    	let h20;
    	let t2;
    	let div6;
    	let div1;
    	let div0;
    	let svg0;
    	let use0;
    	let t3;
    	let h21;
    	let t5;
    	let p0;
    	let t7;
    	let a0;
    	let t8;
    	let svg1;
    	let use1;
    	let t9;
    	let div3;
    	let div2;
    	let svg2;
    	let use2;
    	let t10;
    	let h22;
    	let t12;
    	let p1;
    	let t14;
    	let a1;
    	let t15;
    	let svg3;
    	let use3;
    	let t16;
    	let div5;
    	let div4;
    	let svg4;
    	let use4;
    	let t17;
    	let h23;
    	let t19;
    	let p2;
    	let t21;
    	let a2;
    	let t22;
    	let svg5;
    	let use5;
    	let current;
    	let mounted;
    	let dispose;
    	svgpic = new SvgPic({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(svgpic.$$.fragment);
    			t0 = space();
    			div7 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Klasifikasi Produk";
    			t2 = space();
    			div6 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			svg0 = svg_element("svg");
    			use0 = svg_element("use");
    			t3 = space();
    			h21 = element("h2");
    			h21.textContent = "Klasifikasi A";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum, dolor sit amet consectetur adipisicing elit.\r\n                Dolores labore, aperiam quis neque rem ratione dignissimos, quos\r\n                laboriosam qui iste repudiandae ad temporibus facere, sed quam\r\n                amet. Perspiciatis, quo minima!";
    			t7 = space();
    			a0 = element("a");
    			t8 = text("Lihat Detail\r\n                ");
    			svg1 = svg_element("svg");
    			use1 = svg_element("use");
    			t9 = space();
    			div3 = element("div");
    			div2 = element("div");
    			svg2 = svg_element("svg");
    			use2 = svg_element("use");
    			t10 = space();
    			h22 = element("h2");
    			h22.textContent = "Klasifikasi B";
    			t12 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Illo,\r\n                quod totam error voluptates dignissimos distinctio corrupti\r\n                ipsum pariatur, dolorum velit id ullam molestias! Iure\r\n                perferendis dolorem earum beatae nam neque.";
    			t14 = space();
    			a1 = element("a");
    			t15 = text("Lihat Detail\r\n                ");
    			svg3 = svg_element("svg");
    			use3 = svg_element("use");
    			t16 = space();
    			div5 = element("div");
    			div4 = element("div");
    			svg4 = svg_element("svg");
    			use4 = svg_element("use");
    			t17 = space();
    			h23 = element("h2");
    			h23.textContent = "Klasifikasi C";
    			t19 = space();
    			p2 = element("p");
    			p2.textContent = "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Rerum\r\n                quis repudiandae numquam molestiae aspernatur officiis quasi\r\n                reiciendis blanditiis. Itaque alias harum unde veritatis numquam\r\n                quibusdam dolore odio eaque excepturi vero?";
    			t21 = space();
    			a2 = element("a");
    			t22 = text("Lihat Detail\r\n                ");
    			svg5 = svg_element("svg");
    			use5 = svg_element("use");
    			attr_dev(h20, "class", "pb-2 border-bottom");
    			add_location(h20, file$4, 21, 4, 393);
    			xlink_attr(use0, "xlink:href", "#collection");
    			add_location(use0, file$4, 26, 21, 683);
    			attr_dev(svg0, "class", "bi");
    			attr_dev(svg0, "width", "1em");
    			attr_dev(svg0, "height", "1em");
    			add_location(svg0, file$4, 25, 16, 620);
    			attr_dev(div0, "class", "feature-icon bg-primary bg-gradient");
    			add_location(div0, file$4, 24, 12, 553);
    			add_location(h21, file$4, 29, 12, 773);
    			add_location(p0, file$4, 30, 12, 809);
    			xlink_attr(use1, "xlink:href", "#chevron-right");
    			add_location(use1, file$4, 39, 21, 1288);
    			attr_dev(svg1, "class", "bi");
    			attr_dev(svg1, "width", "1em");
    			attr_dev(svg1, "height", "1em");
    			add_location(svg1, file$4, 38, 16, 1225);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "icon-link");
    			add_location(a0, file$4, 36, 12, 1130);
    			attr_dev(div1, "class", "feature col");
    			add_location(div1, file$4, 23, 8, 514);
    			xlink_attr(use2, "xlink:href", "#people-circle");
    			add_location(use2, file$4, 46, 21, 1560);
    			attr_dev(svg2, "class", "bi");
    			attr_dev(svg2, "width", "1em");
    			attr_dev(svg2, "height", "1em");
    			add_location(svg2, file$4, 45, 16, 1497);
    			attr_dev(div2, "class", "feature-icon bg-primary bg-gradient");
    			add_location(div2, file$4, 44, 12, 1430);
    			add_location(h22, file$4, 49, 12, 1653);
    			add_location(p1, file$4, 50, 12, 1689);
    			xlink_attr(use3, "xlink:href", "#chevron-right");
    			add_location(use3, file$4, 59, 21, 2172);
    			attr_dev(svg3, "class", "bi");
    			attr_dev(svg3, "width", "1em");
    			attr_dev(svg3, "height", "1em");
    			add_location(svg3, file$4, 58, 16, 2109);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "icon-link");
    			add_location(a1, file$4, 56, 12, 2014);
    			attr_dev(div3, "class", "feature col");
    			add_location(div3, file$4, 43, 8, 1391);
    			xlink_attr(use4, "xlink:href", "#toggles2");
    			add_location(use4, file$4, 66, 21, 2444);
    			attr_dev(svg4, "class", "bi");
    			attr_dev(svg4, "width", "1em");
    			attr_dev(svg4, "height", "1em");
    			add_location(svg4, file$4, 65, 16, 2381);
    			attr_dev(div4, "class", "feature-icon bg-primary bg-gradient");
    			add_location(div4, file$4, 64, 12, 2314);
    			add_location(h23, file$4, 69, 12, 2532);
    			add_location(p2, file$4, 70, 12, 2568);
    			xlink_attr(use5, "xlink:href", "#chevron-right");
    			add_location(use5, file$4, 79, 21, 3063);
    			attr_dev(svg5, "class", "bi");
    			attr_dev(svg5, "width", "1em");
    			attr_dev(svg5, "height", "1em");
    			add_location(svg5, file$4, 78, 16, 3000);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "icon-link");
    			add_location(a2, file$4, 76, 12, 2905);
    			attr_dev(div5, "class", "feature col");
    			add_location(div5, file$4, 63, 8, 2275);
    			attr_dev(div6, "class", "row g-4 py-5 row-cols-1 row-cols-lg-3");
    			add_location(div6, file$4, 22, 4, 453);
    			attr_dev(div7, "class", "container px-4 py-5");
    			attr_dev(div7, "id", "featured-3");
    			add_location(div7, file$4, 20, 0, 338);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(svgpic, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, h20);
    			append_dev(div7, t2);
    			append_dev(div7, div6);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div0, svg0);
    			append_dev(svg0, use0);
    			append_dev(div1, t3);
    			append_dev(div1, h21);
    			append_dev(div1, t5);
    			append_dev(div1, p0);
    			append_dev(div1, t7);
    			append_dev(div1, a0);
    			append_dev(a0, t8);
    			append_dev(a0, svg1);
    			append_dev(svg1, use1);
    			append_dev(div6, t9);
    			append_dev(div6, div3);
    			append_dev(div3, div2);
    			append_dev(div2, svg2);
    			append_dev(svg2, use2);
    			append_dev(div3, t10);
    			append_dev(div3, h22);
    			append_dev(div3, t12);
    			append_dev(div3, p1);
    			append_dev(div3, t14);
    			append_dev(div3, a1);
    			append_dev(a1, t15);
    			append_dev(a1, svg3);
    			append_dev(svg3, use3);
    			append_dev(div6, t16);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, svg4);
    			append_dev(svg4, use4);
    			append_dev(div5, t17);
    			append_dev(div5, h23);
    			append_dev(div5, t19);
    			append_dev(div5, p2);
    			append_dev(div5, t21);
    			append_dev(div5, a2);
    			append_dev(a2, t22);
    			append_dev(a2, svg5);
    			append_dev(svg5, use5);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", /*menuA*/ ctx[0], false, false, false),
    					listen_dev(a1, "click", /*menuB*/ ctx[1], false, false, false),
    					listen_dev(a2, "click", /*menuC*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(svgpic.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(svgpic.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(svgpic, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Product", slots, []);
    	let menuPrd = 0;
    	let menuItm = 0;

    	function menuA() {
    		swMenu.set(11);
    	}

    	function menuB() {
    		swMenu.set(12);
    	}

    	function menuC() {
    		swMenu.set(13);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Product> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		SvgPic,
    		swMenu,
    		menuPrd,
    		menuItm,
    		menuA,
    		menuB,
    		menuC
    	});

    	$$self.$inject_state = $$props => {
    		if ("menuPrd" in $$props) menuPrd = $$props.menuPrd;
    		if ("menuItm" in $$props) menuItm = $$props.menuItm;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [menuA, menuB, menuC];
    }

    class Product extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Product",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Item.svelte generated by Svelte v3.38.2 */
    const file$3 = "src\\Item.svelte";

    function create_fragment$3(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let div35;
    	let div34;
    	let div33;
    	let div7;
    	let div6;
    	let svg0;
    	let title0;
    	let t3;
    	let rect0;
    	let text0;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let div5;
    	let p0;
    	let t9;
    	let div4;
    	let div3;
    	let button0;
    	let t11;
    	let div12;
    	let div11;
    	let svg1;
    	let title1;
    	let t12;
    	let rect1;
    	let text1;
    	let t13;
    	let t14;
    	let t15;
    	let t16;
    	let div10;
    	let p1;
    	let t18;
    	let div9;
    	let div8;
    	let button1;
    	let t20;
    	let div17;
    	let div16;
    	let svg2;
    	let title2;
    	let t21;
    	let rect2;
    	let text2;
    	let t22;
    	let t23;
    	let t24;
    	let t25;
    	let div15;
    	let p2;
    	let t27;
    	let div14;
    	let div13;
    	let button2;
    	let t29;
    	let div22;
    	let div21;
    	let svg3;
    	let title3;
    	let t30;
    	let rect3;
    	let text3;
    	let t31;
    	let t32;
    	let t33;
    	let t34;
    	let div20;
    	let p3;
    	let t36;
    	let div19;
    	let div18;
    	let button3;
    	let t38;
    	let div27;
    	let div26;
    	let svg4;
    	let title4;
    	let t39;
    	let rect4;
    	let text4;
    	let t40;
    	let t41;
    	let t42;
    	let t43;
    	let div25;
    	let p4;
    	let t45;
    	let div24;
    	let div23;
    	let button4;
    	let t47;
    	let div32;
    	let div31;
    	let svg5;
    	let title5;
    	let t48;
    	let rect5;
    	let text5;
    	let t49;
    	let t50;
    	let t51;
    	let t52;
    	let div30;
    	let p5;
    	let t54;
    	let div29;
    	let div28;
    	let button5;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			t0 = text("Produk Kategory ");
    			t1 = text(/*hdr*/ ctx[0]);
    			t2 = space();
    			div35 = element("div");
    			div34 = element("div");
    			div33 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			svg0 = svg_element("svg");
    			title0 = svg_element("title");
    			t3 = text("Placeholder");
    			rect0 = svg_element("rect");
    			text0 = svg_element("text");
    			t4 = text("Barang ");
    			t5 = text(/*hdr*/ ctx[0]);
    			t6 = text("01");
    			t7 = space();
    			div5 = element("div");
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing\r\n                            elit. Tenetur autem molestiae incidunt voluptatum\r\n                            aspernatur vero, sunt officia. Itaque doloribus\r\n                            perferendis, suscipit delectus nostrum molestias\r\n                            dolorem. Excepturi, magni. Non, ratione quaerat.";
    			t9 = space();
    			div4 = element("div");
    			div3 = element("div");
    			button0 = element("button");
    			button0.textContent = "View";
    			t11 = space();
    			div12 = element("div");
    			div11 = element("div");
    			svg1 = svg_element("svg");
    			title1 = svg_element("title");
    			t12 = text("Placeholder");
    			rect1 = svg_element("rect");
    			text1 = svg_element("text");
    			t13 = text("Barang ");
    			t14 = text(/*hdr*/ ctx[0]);
    			t15 = text("02");
    			t16 = space();
    			div10 = element("div");
    			p1 = element("p");
    			p1.textContent = "Lorem ipsum, dolor sit amet consectetur adipisicing\r\n                            elit. Iste fugit dolorem reiciendis culpa, placeat\r\n                            cupiditate blanditiis alias quasi quidem. Ullam\r\n                            repellendus assumenda rem dolorem a nobis totam eum\r\n                            sapiente incidunt.";
    			t18 = space();
    			div9 = element("div");
    			div8 = element("div");
    			button1 = element("button");
    			button1.textContent = "View";
    			t20 = space();
    			div17 = element("div");
    			div16 = element("div");
    			svg2 = svg_element("svg");
    			title2 = svg_element("title");
    			t21 = text("Placeholder");
    			rect2 = svg_element("rect");
    			text2 = svg_element("text");
    			t22 = text("Barang ");
    			t23 = text(/*hdr*/ ctx[0]);
    			t24 = text("03");
    			t25 = space();
    			div15 = element("div");
    			p2 = element("p");
    			p2.textContent = "Lorem ipsum dolor sit amet consectetur, adipisicing\r\n                            elit. Hic sapiente expedita recusandae eius sit?\r\n                            Odio sunt quidem placeat veritatis molestias maiores\r\n                            repellendus, numquam magni, voluptatem nobis\r\n                            delectus assumenda blanditiis. Rem?";
    			t27 = space();
    			div14 = element("div");
    			div13 = element("div");
    			button2 = element("button");
    			button2.textContent = "View";
    			t29 = space();
    			div22 = element("div");
    			div21 = element("div");
    			svg3 = svg_element("svg");
    			title3 = svg_element("title");
    			t30 = text("Placeholder");
    			rect3 = svg_element("rect");
    			text3 = svg_element("text");
    			t31 = text("Barang ");
    			t32 = text(/*hdr*/ ctx[0]);
    			t33 = text("04");
    			t34 = space();
    			div20 = element("div");
    			p3 = element("p");
    			p3.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing\r\n                            elit. Perferendis sint pariatur voluptates provident\r\n                            consequuntur excepturi. Beatae enim doloremque iusto\r\n                            tempore aliquam eaque, itaque mollitia odit modi\r\n                            perspiciatis id, voluptas et?";
    			t36 = space();
    			div19 = element("div");
    			div18 = element("div");
    			button3 = element("button");
    			button3.textContent = "View";
    			t38 = space();
    			div27 = element("div");
    			div26 = element("div");
    			svg4 = svg_element("svg");
    			title4 = svg_element("title");
    			t39 = text("Placeholder");
    			rect4 = svg_element("rect");
    			text4 = svg_element("text");
    			t40 = text("Barang ");
    			t41 = text(/*hdr*/ ctx[0]);
    			t42 = text("05");
    			t43 = space();
    			div25 = element("div");
    			p4 = element("p");
    			p4.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing\r\n                            elit. Rem numquam explicabo nulla, molestiae\r\n                            necessitatibus, quaerat eaque cupiditate suscipit a\r\n                            aspernatur laborum. Consectetur eveniet voluptas\r\n                            dicta consequatur molestiae quasi sequi illum?";
    			t45 = space();
    			div24 = element("div");
    			div23 = element("div");
    			button4 = element("button");
    			button4.textContent = "View";
    			t47 = space();
    			div32 = element("div");
    			div31 = element("div");
    			svg5 = svg_element("svg");
    			title5 = svg_element("title");
    			t48 = text("Placeholder");
    			rect5 = svg_element("rect");
    			text5 = svg_element("text");
    			t49 = text("Barang ");
    			t50 = text(/*hdr*/ ctx[0]);
    			t51 = text("06");
    			t52 = space();
    			div30 = element("div");
    			p5 = element("p");
    			p5.textContent = "Lorem, ipsum dolor sit amet consectetur adipisicing\r\n                            elit. Quisquam, maxime repellat et voluptatum\r\n                            numquam voluptas aut quidem porro mollitia nihil\r\n                            error facilis necessitatibus nemo ex. Dignissimos\r\n                            omnis fugit sint placeat.";
    			t54 = space();
    			div29 = element("div");
    			div28 = element("div");
    			button5 = element("button");
    			button5.textContent = "View";
    			attr_dev(h1, "class", "fw-light");
    			add_location(h1, file$3, 17, 12, 384);
    			attr_dev(div0, "class", "col-lg-6 col-md-8 mx-auto");
    			add_location(div0, file$3, 16, 8, 331);
    			attr_dev(div1, "class", "row py-lg-5");
    			add_location(div1, file$3, 15, 4, 296);
    			attr_dev(div2, "class", "text-center container mt-3");
    			add_location(div2, file$3, 14, 0, 250);
    			add_location(title0, file$3, 52, 25, 1939);
    			attr_dev(rect0, "width", "100%");
    			attr_dev(rect0, "height", "100%");
    			attr_dev(rect0, "fill", "#55595c");
    			add_location(rect0, file$3, 52, 51, 1965);
    			attr_dev(text0, "x", "50%");
    			attr_dev(text0, "y", "50%");
    			attr_dev(text0, "fill", "#eceeef");
    			attr_dev(text0, "dy", ".3em");
    			add_location(text0, file$3, 56, 26, 2127);
    			attr_dev(svg0, "class", "bd-placeholder-img card-img-top");
    			attr_dev(svg0, "width", "100%");
    			attr_dev(svg0, "height", "225");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "role", "img");
    			attr_dev(svg0, "aria-label", "Placeholder: Thumbnail");
    			attr_dev(svg0, "preserveAspectRatio", "xMidYMid slice");
    			attr_dev(svg0, "focusable", "false");
    			add_location(svg0, file$3, 43, 20, 1505);
    			attr_dev(p0, "class", "card-text");
    			add_location(p0, file$3, 62, 24, 2352);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-sm btn-outline-secondary px-3");
    			add_location(button0, file$3, 73, 32, 3026);
    			attr_dev(div3, "class", "btn-group");
    			add_location(div3, file$3, 72, 28, 2969);
    			attr_dev(div4, "class", "d-flex justify-content-between align-items-center");
    			add_location(div4, file$3, 69, 24, 2821);
    			attr_dev(div5, "class", "card-body");
    			add_location(div5, file$3, 61, 20, 2303);
    			attr_dev(div6, "class", "card shadow rounded");
    			add_location(div6, file$3, 42, 16, 1450);
    			attr_dev(div7, "class", "col");
    			add_location(div7, file$3, 41, 12, 1415);
    			add_location(title1, file$3, 101, 25, 4341);
    			attr_dev(rect1, "width", "100%");
    			attr_dev(rect1, "height", "100%");
    			attr_dev(rect1, "fill", "#55595c");
    			add_location(rect1, file$3, 101, 51, 4367);
    			attr_dev(text1, "x", "50%");
    			attr_dev(text1, "y", "50%");
    			attr_dev(text1, "fill", "#eceeef");
    			attr_dev(text1, "dy", ".3em");
    			add_location(text1, file$3, 105, 26, 4529);
    			attr_dev(svg1, "class", "bd-placeholder-img card-img-top");
    			attr_dev(svg1, "width", "100%");
    			attr_dev(svg1, "height", "225");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "role", "img");
    			attr_dev(svg1, "aria-label", "Placeholder: Thumbnail");
    			attr_dev(svg1, "preserveAspectRatio", "xMidYMid slice");
    			attr_dev(svg1, "focusable", "false");
    			add_location(svg1, file$3, 92, 20, 3907);
    			attr_dev(p1, "class", "card-text");
    			add_location(p1, file$3, 111, 24, 4754);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-sm btn-outline-secondary px-3");
    			add_location(button1, file$3, 122, 32, 5403);
    			attr_dev(div8, "class", "btn-group");
    			add_location(div8, file$3, 121, 28, 5346);
    			attr_dev(div9, "class", "d-flex justify-content-between align-items-center");
    			add_location(div9, file$3, 118, 24, 5198);
    			attr_dev(div10, "class", "card-body");
    			add_location(div10, file$3, 110, 20, 4705);
    			attr_dev(div11, "class", "card shadow rounded");
    			add_location(div11, file$3, 91, 16, 3852);
    			attr_dev(div12, "class", "col");
    			add_location(div12, file$3, 90, 12, 3817);
    			add_location(title2, file$3, 150, 25, 6702);
    			attr_dev(rect2, "width", "100%");
    			attr_dev(rect2, "height", "100%");
    			attr_dev(rect2, "fill", "#55595c");
    			add_location(rect2, file$3, 150, 51, 6728);
    			attr_dev(text2, "x", "50%");
    			attr_dev(text2, "y", "50%");
    			attr_dev(text2, "fill", "#eceeef");
    			attr_dev(text2, "dy", ".3em");
    			add_location(text2, file$3, 154, 26, 6890);
    			attr_dev(svg2, "class", "bd-placeholder-img card-img-top");
    			attr_dev(svg2, "width", "100%");
    			attr_dev(svg2, "height", "225");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "role", "img");
    			attr_dev(svg2, "aria-label", "Placeholder: Thumbnail");
    			attr_dev(svg2, "preserveAspectRatio", "xMidYMid slice");
    			attr_dev(svg2, "focusable", "false");
    			add_location(svg2, file$3, 141, 20, 6268);
    			attr_dev(p2, "class", "card-text");
    			add_location(p2, file$3, 160, 24, 7115);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-sm btn-outline-secondary px-3");
    			add_location(button2, file$3, 171, 32, 7777);
    			attr_dev(div13, "class", "btn-group");
    			add_location(div13, file$3, 170, 28, 7720);
    			attr_dev(div14, "class", "d-flex justify-content-between align-items-center");
    			add_location(div14, file$3, 167, 24, 7572);
    			attr_dev(div15, "class", "card-body");
    			add_location(div15, file$3, 159, 20, 7066);
    			attr_dev(div16, "class", "card shadow rounded");
    			add_location(div16, file$3, 140, 16, 6213);
    			attr_dev(div17, "class", "col");
    			add_location(div17, file$3, 139, 12, 6178);
    			add_location(title3, file$3, 200, 25, 9078);
    			attr_dev(rect3, "width", "100%");
    			attr_dev(rect3, "height", "100%");
    			attr_dev(rect3, "fill", "#55595c");
    			add_location(rect3, file$3, 200, 51, 9104);
    			attr_dev(text3, "x", "50%");
    			attr_dev(text3, "y", "50%");
    			attr_dev(text3, "fill", "#eceeef");
    			attr_dev(text3, "dy", ".3em");
    			add_location(text3, file$3, 204, 26, 9266);
    			attr_dev(svg3, "class", "bd-placeholder-img card-img-top");
    			attr_dev(svg3, "width", "100%");
    			attr_dev(svg3, "height", "225");
    			attr_dev(svg3, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg3, "role", "img");
    			attr_dev(svg3, "aria-label", "Placeholder: Thumbnail");
    			attr_dev(svg3, "preserveAspectRatio", "xMidYMid slice");
    			attr_dev(svg3, "focusable", "false");
    			add_location(svg3, file$3, 191, 20, 8644);
    			attr_dev(p3, "class", "card-text");
    			add_location(p3, file$3, 210, 24, 9491);
    			attr_dev(button3, "type", "button");
    			attr_dev(button3, "class", "btn btn-sm btn-outline-secondary px-3");
    			add_location(button3, file$3, 221, 32, 10155);
    			attr_dev(div18, "class", "btn-group");
    			add_location(div18, file$3, 220, 28, 10098);
    			attr_dev(div19, "class", "d-flex justify-content-between align-items-center");
    			add_location(div19, file$3, 217, 24, 9950);
    			attr_dev(div20, "class", "card-body");
    			add_location(div20, file$3, 209, 20, 9442);
    			attr_dev(div21, "class", "card shadow rounded");
    			add_location(div21, file$3, 190, 16, 8589);
    			attr_dev(div22, "class", "col");
    			add_location(div22, file$3, 189, 12, 8554);
    			add_location(title4, file$3, 249, 25, 11454);
    			attr_dev(rect4, "width", "100%");
    			attr_dev(rect4, "height", "100%");
    			attr_dev(rect4, "fill", "#55595c");
    			add_location(rect4, file$3, 249, 51, 11480);
    			attr_dev(text4, "x", "50%");
    			attr_dev(text4, "y", "50%");
    			attr_dev(text4, "fill", "#eceeef");
    			attr_dev(text4, "dy", ".3em");
    			add_location(text4, file$3, 253, 26, 11642);
    			attr_dev(svg4, "class", "bd-placeholder-img card-img-top");
    			attr_dev(svg4, "width", "100%");
    			attr_dev(svg4, "height", "225");
    			attr_dev(svg4, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg4, "role", "img");
    			attr_dev(svg4, "aria-label", "Placeholder: Thumbnail");
    			attr_dev(svg4, "preserveAspectRatio", "xMidYMid slice");
    			attr_dev(svg4, "focusable", "false");
    			add_location(svg4, file$3, 240, 20, 11020);
    			attr_dev(p4, "class", "card-text");
    			add_location(p4, file$3, 259, 24, 11867);
    			attr_dev(button4, "type", "button");
    			attr_dev(button4, "class", "btn btn-sm btn-outline-secondary px-3");
    			add_location(button4, file$3, 270, 32, 12539);
    			attr_dev(div23, "class", "btn-group");
    			add_location(div23, file$3, 269, 28, 12482);
    			attr_dev(div24, "class", "d-flex justify-content-between align-items-center");
    			add_location(div24, file$3, 266, 24, 12334);
    			attr_dev(div25, "class", "card-body");
    			add_location(div25, file$3, 258, 20, 11818);
    			attr_dev(div26, "class", "card shadow rounded");
    			add_location(div26, file$3, 239, 16, 10965);
    			attr_dev(div27, "class", "col");
    			add_location(div27, file$3, 238, 12, 10930);
    			add_location(title5, file$3, 298, 25, 13838);
    			attr_dev(rect5, "width", "100%");
    			attr_dev(rect5, "height", "100%");
    			attr_dev(rect5, "fill", "#55595c");
    			add_location(rect5, file$3, 298, 51, 13864);
    			attr_dev(text5, "x", "50%");
    			attr_dev(text5, "y", "50%");
    			attr_dev(text5, "fill", "#eceeef");
    			attr_dev(text5, "dy", ".3em");
    			add_location(text5, file$3, 302, 26, 14026);
    			attr_dev(svg5, "class", "bd-placeholder-img card-img-top");
    			attr_dev(svg5, "width", "100%");
    			attr_dev(svg5, "height", "225");
    			attr_dev(svg5, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg5, "role", "img");
    			attr_dev(svg5, "aria-label", "Placeholder: Thumbnail");
    			attr_dev(svg5, "preserveAspectRatio", "xMidYMid slice");
    			attr_dev(svg5, "focusable", "false");
    			add_location(svg5, file$3, 289, 20, 13404);
    			attr_dev(p5, "class", "card-text");
    			add_location(p5, file$3, 308, 24, 14251);
    			attr_dev(button5, "type", "button");
    			attr_dev(button5, "class", "btn btn-sm btn-outline-secondary px-3");
    			add_location(button5, file$3, 319, 32, 14901);
    			attr_dev(div28, "class", "btn-group");
    			add_location(div28, file$3, 318, 28, 14844);
    			attr_dev(div29, "class", "d-flex justify-content-between align-items-center");
    			add_location(div29, file$3, 315, 24, 14696);
    			attr_dev(div30, "class", "card-body");
    			add_location(div30, file$3, 307, 20, 14202);
    			attr_dev(div31, "class", "card shadow rounded");
    			add_location(div31, file$3, 288, 16, 13349);
    			attr_dev(div32, "class", "col");
    			add_location(div32, file$3, 287, 12, 13314);
    			attr_dev(div33, "class", "row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3");
    			add_location(div33, file$3, 40, 8, 1341);
    			attr_dev(div34, "class", "container");
    			add_location(div34, file$3, 39, 4, 1308);
    			attr_dev(div35, "class", "album bg-light mb-3");
    			add_location(div35, file$3, 38, 0, 1269);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div35, anchor);
    			append_dev(div35, div34);
    			append_dev(div34, div33);
    			append_dev(div33, div7);
    			append_dev(div7, div6);
    			append_dev(div6, svg0);
    			append_dev(svg0, title0);
    			append_dev(title0, t3);
    			append_dev(svg0, rect0);
    			append_dev(svg0, text0);
    			append_dev(text0, t4);
    			append_dev(text0, t5);
    			append_dev(text0, t6);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div5, p0);
    			append_dev(div5, t9);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, button0);
    			append_dev(div33, t11);
    			append_dev(div33, div12);
    			append_dev(div12, div11);
    			append_dev(div11, svg1);
    			append_dev(svg1, title1);
    			append_dev(title1, t12);
    			append_dev(svg1, rect1);
    			append_dev(svg1, text1);
    			append_dev(text1, t13);
    			append_dev(text1, t14);
    			append_dev(text1, t15);
    			append_dev(div11, t16);
    			append_dev(div11, div10);
    			append_dev(div10, p1);
    			append_dev(div10, t18);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, button1);
    			append_dev(div33, t20);
    			append_dev(div33, div17);
    			append_dev(div17, div16);
    			append_dev(div16, svg2);
    			append_dev(svg2, title2);
    			append_dev(title2, t21);
    			append_dev(svg2, rect2);
    			append_dev(svg2, text2);
    			append_dev(text2, t22);
    			append_dev(text2, t23);
    			append_dev(text2, t24);
    			append_dev(div16, t25);
    			append_dev(div16, div15);
    			append_dev(div15, p2);
    			append_dev(div15, t27);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, button2);
    			append_dev(div33, t29);
    			append_dev(div33, div22);
    			append_dev(div22, div21);
    			append_dev(div21, svg3);
    			append_dev(svg3, title3);
    			append_dev(title3, t30);
    			append_dev(svg3, rect3);
    			append_dev(svg3, text3);
    			append_dev(text3, t31);
    			append_dev(text3, t32);
    			append_dev(text3, t33);
    			append_dev(div21, t34);
    			append_dev(div21, div20);
    			append_dev(div20, p3);
    			append_dev(div20, t36);
    			append_dev(div20, div19);
    			append_dev(div19, div18);
    			append_dev(div18, button3);
    			append_dev(div33, t38);
    			append_dev(div33, div27);
    			append_dev(div27, div26);
    			append_dev(div26, svg4);
    			append_dev(svg4, title4);
    			append_dev(title4, t39);
    			append_dev(svg4, rect4);
    			append_dev(svg4, text4);
    			append_dev(text4, t40);
    			append_dev(text4, t41);
    			append_dev(text4, t42);
    			append_dev(div26, t43);
    			append_dev(div26, div25);
    			append_dev(div25, p4);
    			append_dev(div25, t45);
    			append_dev(div25, div24);
    			append_dev(div24, div23);
    			append_dev(div23, button4);
    			append_dev(div33, t47);
    			append_dev(div33, div32);
    			append_dev(div32, div31);
    			append_dev(div31, svg5);
    			append_dev(svg5, title5);
    			append_dev(title5, t48);
    			append_dev(svg5, rect5);
    			append_dev(svg5, text5);
    			append_dev(text5, t49);
    			append_dev(text5, t50);
    			append_dev(text5, t51);
    			append_dev(div31, t52);
    			append_dev(div31, div30);
    			append_dev(div30, p5);
    			append_dev(div30, t54);
    			append_dev(div30, div29);
    			append_dev(div29, div28);
    			append_dev(div28, button5);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*hdr*/ 1) set_data_dev(t1, /*hdr*/ ctx[0]);
    			if (dirty & /*hdr*/ 1) set_data_dev(t5, /*hdr*/ ctx[0]);
    			if (dirty & /*hdr*/ 1) set_data_dev(t14, /*hdr*/ ctx[0]);
    			if (dirty & /*hdr*/ 1) set_data_dev(t23, /*hdr*/ ctx[0]);
    			if (dirty & /*hdr*/ 1) set_data_dev(t32, /*hdr*/ ctx[0]);
    			if (dirty & /*hdr*/ 1) set_data_dev(t41, /*hdr*/ ctx[0]);
    			if (dirty & /*hdr*/ 1) set_data_dev(t50, /*hdr*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div35);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $swMenu;
    	validate_store(swMenu, "swMenu");
    	component_subscribe($$self, swMenu, $$value => $$invalidate(1, $swMenu = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Item", slots, []);
    	let hdr = "";

    	if ($swMenu === 11) {
    		hdr = "A";
    	} else if ($swMenu === 12) {
    		hdr = "B";
    	} else if ($swMenu === 13) {
    		hdr = "C";
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Item> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ swMenu, hdr, $swMenu });

    	$$self.$inject_state = $$props => {
    		if ("hdr" in $$props) $$invalidate(0, hdr = $$props.hdr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hdr];
    }

    class Item extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Item",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Inquiry.svelte generated by Svelte v3.38.2 */

    const file$2 = "src\\Inquiry.svelte";

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let p;
    	let t3;
    	let div12;
    	let form;
    	let div2;
    	let label0;
    	let t5;
    	let input0;
    	let t6;
    	let div3;
    	let label1;
    	let t8;
    	let input1;
    	let t9;
    	let div4;
    	let label2;
    	let t11;
    	let input2;
    	let t12;
    	let div5;
    	let label3;
    	let t14;
    	let input3;
    	let t15;
    	let div6;
    	let label4;
    	let t17;
    	let input4;
    	let t18;
    	let div7;
    	let label5;
    	let t20;
    	let input5;
    	let t21;
    	let div8;
    	let label6;
    	let t23;
    	let input6;
    	let t24;
    	let div9;
    	let label7;
    	let t26;
    	let input7;
    	let t27;
    	let div10;
    	let label8;
    	let t29;
    	let textarea;
    	let t30;
    	let div11;
    	let button;
    	let i;
    	let t31;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Inquiry Produk";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt\r\n\t\t\ttotam vitae, tenetur recusandae, dolores neque optio ducimus\r\n\t\t\tvoluptates possimus, nesciunt repellendus laudantium explicabo quae\r\n\t\t\tmaiores fuga aspernatur sapiente modi sint.";
    			t3 = space();
    			div12 = element("div");
    			form = element("form");
    			div2 = element("div");
    			label0 = element("label");
    			label0.textContent = "Nama";
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Last Name";
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			div4 = element("div");
    			label2 = element("label");
    			label2.textContent = "Email";
    			t11 = space();
    			input2 = element("input");
    			t12 = space();
    			div5 = element("div");
    			label3 = element("label");
    			label3.textContent = "Alamat";
    			t14 = space();
    			input3 = element("input");
    			t15 = space();
    			div6 = element("div");
    			label4 = element("label");
    			label4.textContent = "Alamat 2";
    			t17 = space();
    			input4 = element("input");
    			t18 = space();
    			div7 = element("div");
    			label5 = element("label");
    			label5.textContent = "Kota";
    			t20 = space();
    			input5 = element("input");
    			t21 = space();
    			div8 = element("div");
    			label6 = element("label");
    			label6.textContent = "Negara";
    			t23 = space();
    			input6 = element("input");
    			t24 = space();
    			div9 = element("div");
    			label7 = element("label");
    			label7.textContent = "Kode pos";
    			t26 = space();
    			input7 = element("input");
    			t27 = space();
    			div10 = element("div");
    			label8 = element("label");
    			label8.textContent = "Keterangan";
    			t29 = space();
    			textarea = element("textarea");
    			t30 = space();
    			div11 = element("div");
    			button = element("button");
    			i = element("i");
    			t31 = text("Kirim email");
    			attr_dev(h2, "class", "display-6");
    			add_location(h2, file$2, 6, 2, 201);
    			attr_dev(p, "class", "lead");
    			add_location(p, file$2, 7, 2, 246);
    			attr_dev(div0, "class", "py-5 text-center");
    			add_location(div0, file$2, 4, 1, 49);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$2, 3, 0, 23);
    			attr_dev(label0, "for", "nama");
    			attr_dev(label0, "class", "form-label");
    			add_location(label0, file$2, 19, 3, 627);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "id", "nama");
    			attr_dev(input0, "placeholder", "");
    			add_location(input0, file$2, 20, 3, 681);
    			attr_dev(div2, "class", "col-8");
    			add_location(div2, file$2, 18, 2, 603);
    			attr_dev(label1, "for", "nama1");
    			attr_dev(label1, "class", "form-label");
    			add_location(label1, file$2, 23, 3, 786);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "nama");
    			attr_dev(input1, "placeholder", "");
    			add_location(input1, file$2, 24, 3, 846);
    			attr_dev(div3, "class", "col-4");
    			add_location(div3, file$2, 22, 2, 762);
    			attr_dev(label2, "for", "inputEmail4");
    			attr_dev(label2, "class", "form-label");
    			add_location(label2, file$2, 27, 3, 954);
    			attr_dev(input2, "type", "email");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "id", "inputEmail4");
    			add_location(input2, file$2, 28, 3, 1016);
    			attr_dev(div4, "class", "col-md-6");
    			add_location(div4, file$2, 26, 2, 927);
    			attr_dev(label3, "for", "inputAddress");
    			attr_dev(label3, "class", "form-label");
    			add_location(label3, file$2, 35, 3, 1299);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "class", "form-control");
    			attr_dev(input3, "id", "inputAddress");
    			attr_dev(input3, "placeholder", "");
    			add_location(input3, file$2, 36, 3, 1363);
    			attr_dev(div5, "class", "col-12");
    			add_location(div5, file$2, 34, 2, 1274);
    			attr_dev(label4, "for", "inputAddress2");
    			attr_dev(label4, "class", "form-label");
    			add_location(label4, file$2, 44, 3, 1501);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "class", "form-control");
    			attr_dev(input4, "id", "inputAddress2");
    			attr_dev(input4, "placeholder", "");
    			add_location(input4, file$2, 45, 3, 1568);
    			attr_dev(div6, "class", "col-12");
    			add_location(div6, file$2, 43, 2, 1476);
    			attr_dev(label5, "for", "inputCity");
    			attr_dev(label5, "class", "form-label");
    			add_location(label5, file$2, 53, 3, 1709);
    			attr_dev(input5, "type", "text");
    			attr_dev(input5, "class", "form-control");
    			attr_dev(input5, "id", "inputCity");
    			add_location(input5, file$2, 54, 3, 1768);
    			attr_dev(div7, "class", "col-md-6");
    			add_location(div7, file$2, 52, 2, 1682);
    			attr_dev(label6, "for", "inputState");
    			attr_dev(label6, "class", "form-label");
    			add_location(label6, file$2, 57, 3, 1866);
    			attr_dev(input6, "type", "text");
    			attr_dev(input6, "class", "form-control");
    			attr_dev(input6, "id", "inputState");
    			add_location(input6, file$2, 62, 3, 2067);
    			attr_dev(div8, "class", "col-md-4");
    			add_location(div8, file$2, 56, 2, 1839);
    			attr_dev(label7, "for", "inputZip");
    			attr_dev(label7, "class", "form-label");
    			add_location(label7, file$2, 65, 3, 2166);
    			attr_dev(input7, "type", "text");
    			attr_dev(input7, "class", "form-control");
    			attr_dev(input7, "id", "inputZip");
    			add_location(input7, file$2, 66, 3, 2228);
    			attr_dev(div9, "class", "col-md-2");
    			add_location(div9, file$2, 64, 2, 2139);
    			attr_dev(label8, "for", "keterangan");
    			attr_dev(label8, "class", "form-label");
    			add_location(label8, file$2, 77, 3, 2564);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "placeholder", "");
    			attr_dev(textarea, "id", "keterangan");
    			set_style(textarea, "height", "100px");
    			add_location(textarea, file$2, 78, 3, 2630);
    			attr_dev(div10, "class", "col-12");
    			add_location(div10, file$2, 76, 2, 2539);
    			attr_dev(i, "class", "far fa-envelope pe-2 fa-lg");
    			add_location(i, file$2, 88, 5, 2833);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file$2, 87, 3, 2781);
    			attr_dev(div11, "class", "col-12");
    			add_location(div11, file$2, 86, 2, 2756);
    			attr_dev(form, "class", "row g-3");
    			add_location(form, file$2, 17, 1, 577);
    			attr_dev(div12, "class", "container mb-5");
    			add_location(div12, file$2, 16, 0, 546);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div12, anchor);
    			append_dev(div12, form);
    			append_dev(form, div2);
    			append_dev(div2, label0);
    			append_dev(div2, t5);
    			append_dev(div2, input0);
    			append_dev(form, t6);
    			append_dev(form, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t8);
    			append_dev(div3, input1);
    			append_dev(form, t9);
    			append_dev(form, div4);
    			append_dev(div4, label2);
    			append_dev(div4, t11);
    			append_dev(div4, input2);
    			append_dev(form, t12);
    			append_dev(form, div5);
    			append_dev(div5, label3);
    			append_dev(div5, t14);
    			append_dev(div5, input3);
    			append_dev(form, t15);
    			append_dev(form, div6);
    			append_dev(div6, label4);
    			append_dev(div6, t17);
    			append_dev(div6, input4);
    			append_dev(form, t18);
    			append_dev(form, div7);
    			append_dev(div7, label5);
    			append_dev(div7, t20);
    			append_dev(div7, input5);
    			append_dev(form, t21);
    			append_dev(form, div8);
    			append_dev(div8, label6);
    			append_dev(div8, t23);
    			append_dev(div8, input6);
    			append_dev(form, t24);
    			append_dev(form, div9);
    			append_dev(div9, label7);
    			append_dev(div9, t26);
    			append_dev(div9, input7);
    			append_dev(form, t27);
    			append_dev(form, div10);
    			append_dev(div10, label8);
    			append_dev(div10, t29);
    			append_dev(div10, textarea);
    			append_dev(form, t30);
    			append_dev(form, div11);
    			append_dev(div11, button);
    			append_dev(button, i);
    			append_dev(button, t31);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div12);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Inquiry", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Inquiry> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Inquiry extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Inquiry",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\About.svelte generated by Svelte v3.38.2 */
    const file$1 = "src\\About.svelte";

    function create_fragment$1(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div2;
    	let h1;
    	let t2;
    	let p;
    	let t4;
    	let div1;
    	let button0;
    	let t6;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Tentang kami";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Optio,\r\n                repudiandae! Quis ipsam quaerat maxime sed ratione\r\n                necessitatibus quia sint rerum, dolor eius asperiores, tempora\r\n                qui! Molestias id quod reiciendis voluptatum. Lorem ipsum dolor\r\n                sit amet consectetur, adipisicing elit. Quam reiciendis qui\r\n                debitis eveniet unde cum, a ab, nobis repellat minus vitae\r\n                porro! Cupiditate at officia culpa asperiores repellendus esse\r\n                molestias! Lorem ipsum dolor sit, amet consectetur adipisicing\r\n                elit. Omnis recusandae expedita, veniam tenetur consequuntur\r\n                inventore a explicabo ducimus est dolore velit beatae assumenda\r\n                saepe quas tempore ratione officia placeat commodi.";
    			t4 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Produk kami";
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "Kontak kami";
    			if (img.src !== (img_src_value = "img/extrana_box.jpeg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "d-block mx-lg-auto img-fluid");
    			attr_dev(img, "alt", "extrana cable");
    			attr_dev(img, "width", "700");
    			attr_dev(img, "height", "500");
    			attr_dev(img, "loading", "lazy");
    			add_location(img, file$1, 14, 12, 365);
    			attr_dev(div0, "class", "col-10 col-sm-8 col-lg-6");
    			add_location(div0, file$1, 13, 8, 313);
    			attr_dev(h1, "class", "display-5 lh-1 mb-3");
    			add_location(h1, file$1, 25, 12, 753);
    			attr_dev(p, "class", "lead");
    			add_location(p, file$1, 26, 12, 816);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-primary btn-lg px-4 me-md-2");
    			add_location(button0, file$1, 40, 16, 1795);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-outline-secondary btn-lg px-4");
    			add_location(button1, file$1, 45, 16, 2003);
    			attr_dev(div1, "class", "d-grid gap-2 d-md-flex justify-content-md-start");
    			add_location(div1, file$1, 39, 12, 1716);
    			attr_dev(div2, "class", "col-lg-6");
    			add_location(div2, file$1, 23, 8, 637);
    			attr_dev(div3, "class", "row flex-lg-row-reverse align-items-center g-5 py-5");
    			add_location(div3, file$1, 12, 4, 238);
    			attr_dev(div4, "class", "container col-xxl-8 px-3 py-3");
    			add_location(div4, file$1, 11, 0, 189);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, img);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t2);
    			append_dev(div2, p);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t6);
    			append_dev(div1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*menuProduct*/ ctx[0], false, false, false),
    					listen_dev(button1, "click", /*menuInquiry*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);

    	function menuProduct() {
    		swMenu.set(1);
    	}

    	function menuInquiry() {
    		swMenu.set(2);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ swMenu, menuProduct, menuInquiry });
    	return [menuProduct, menuInquiry];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.2 */
    const file = "src\\App.svelte";

    // (85:4) {:else}
    function create_else_block(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "page not found ..";
    			attr_dev(h1, "class", "display-1 p-2");
    			add_location(h1, file, 85, 8, 2809);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(85:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (83:28) 
    function create_if_block_4(ctx) {
    	let about;
    	let current;
    	about = new About({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(about.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(about, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(about.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(about.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(about, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(83:28) ",
    		ctx
    	});

    	return block;
    }

    // (81:28) 
    function create_if_block_3(ctx) {
    	let inquiry;
    	let current;
    	inquiry = new Inquiry({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(inquiry.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(inquiry, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inquiry.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inquiry.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(inquiry, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(81:28) ",
    		ctx
    	});

    	return block;
    }

    // (79:65) 
    function create_if_block_2(ctx) {
    	let item;
    	let current;
    	item = new Item({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(item.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(item, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(item.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(item.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(item, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(79:65) ",
    		ctx
    	});

    	return block;
    }

    // (77:28) 
    function create_if_block_1(ctx) {
    	let product;
    	let current;
    	product = new Product({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(product.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(product, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(product, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(77:28) ",
    		ctx
    	});

    	return block;
    }

    // (75:4) {#if $swMenu === 0}
    function create_if_block(ctx) {
    	let home;
    	let current;
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(75:4) {#if $swMenu === 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let header;
    	let nav;
    	let div1;
    	let i;
    	let t0;
    	let a0;
    	let t2;
    	let button;
    	let span;
    	let t3;
    	let div0;
    	let ul;
    	let li0;
    	let a1;
    	let t5;
    	let li1;
    	let a2;
    	let t7;
    	let li2;
    	let a3;
    	let t9;
    	let li3;
    	let a4;
    	let t11;
    	let main;
    	let current_block_type_index;
    	let if_block;
    	let t12;
    	let footer;
    	let p0;
    	let a5;
    	let t14;
    	let p1;
    	let t15;
    	let a6;
    	let t17;
    	let a7;
    	let current;
    	let mounted;
    	let dispose;

    	const if_block_creators = [
    		create_if_block,
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_if_block_4,
    		create_else_block
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$swMenu*/ ctx[0] === 0) return 0;
    		if (/*$swMenu*/ ctx[0] === 1) return 1;
    		if (/*$swMenu*/ ctx[0] === 11 || /*$swMenu*/ ctx[0] === 12 || /*$swMenu*/ ctx[0] === 13) return 2;
    		if (/*$swMenu*/ ctx[0] === 2) return 3;
    		if (/*$swMenu*/ ctx[0] === 3) return 4;
    		return 5;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			header = element("header");
    			nav = element("nav");
    			div1 = element("div");
    			i = element("i");
    			t0 = space();
    			a0 = element("a");
    			a0.textContent = "Extrana Cable";
    			t2 = space();
    			button = element("button");
    			span = element("span");
    			t3 = space();
    			div0 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			a1.textContent = "Home";
    			t5 = space();
    			li1 = element("li");
    			a2 = element("a");
    			a2.textContent = "Product";
    			t7 = space();
    			li2 = element("li");
    			a3 = element("a");
    			a3.textContent = "Inquiry";
    			t9 = space();
    			li3 = element("li");
    			a4 = element("a");
    			a4.textContent = "About us";
    			t11 = space();
    			main = element("main");
    			if_block.c();
    			t12 = space();
    			footer = element("footer");
    			p0 = element("p");
    			a5 = element("a");
    			a5.textContent = "Back to top";
    			t14 = space();
    			p1 = element("p");
    			t15 = text("© 2021 Extrana Cable, Inc. · ");
    			a6 = element("a");
    			a6.textContent = "Privacy";
    			t17 = text("\r\n            · ");
    			a7 = element("a");
    			a7.textContent = "Terms";
    			attr_dev(i, "class", "fas fa-home fa-lg me-2");
    			add_location(i, file, 28, 12, 672);
    			attr_dev(a0, "class", "navbar-brand");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file, 29, 12, 741);
    			attr_dev(span, "class", "navbar-toggler-icon");
    			add_location(span, file, 39, 16, 1164);
    			attr_dev(button, "class", "navbar-toggler");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "data-bs-toggle", "collapse");
    			attr_dev(button, "data-bs-target", "#navbarCollapse");
    			attr_dev(button, "aria-controls", "navbarCollapse");
    			attr_dev(button, "aria-expanded", "false");
    			attr_dev(button, "aria-label", "Toggle navigation");
    			add_location(button, file, 30, 12, 825);
    			attr_dev(a1, "class", "nav-link");
    			attr_dev(a1, "aria-current", "page");
    			attr_dev(a1, "href", "#");
    			add_location(a1, file, 45, 24, 1525);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file, 43, 20, 1379);
    			attr_dev(a2, "class", "nav-link");
    			attr_dev(a2, "href", "#");
    			add_location(a2, file, 53, 24, 1840);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file, 52, 20, 1793);
    			attr_dev(a3, "class", "nav-link");
    			attr_dev(a3, "href", "#");
    			add_location(a3, file, 58, 24, 2055);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file, 57, 20, 2008);
    			attr_dev(a4, "class", "nav-link");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file, 63, 24, 2270);
    			attr_dev(li3, "class", "nav-item");
    			add_location(li3, file, 62, 20, 2223);
    			attr_dev(ul, "class", "navbar-nav me-auto mb-2 mb-md-0");
    			add_location(ul, file, 42, 16, 1313);
    			attr_dev(div0, "class", "collapse navbar-collapse");
    			attr_dev(div0, "id", "navbarCollapse");
    			add_location(div0, file, 41, 12, 1237);
    			attr_dev(div1, "class", "container-fluid");
    			add_location(div1, file, 27, 8, 629);
    			attr_dev(nav, "class", "navbar navbar-expand-md navbar-dark fixed-top bg-dark");
    			add_location(nav, file, 26, 4, 552);
    			add_location(header, file, 25, 0, 538);
    			attr_dev(a5, "href", "#");
    			add_location(a5, file, 90, 29, 2959);
    			attr_dev(p0, "class", "float-end");
    			add_location(p0, file, 90, 8, 2938);
    			attr_dev(a6, "href", "#");
    			add_location(a6, file, 92, 53, 3058);
    			attr_dev(a7, "href", "#");
    			add_location(a7, file, 93, 21, 3104);
    			add_location(p1, file, 91, 8, 3000);
    			attr_dev(footer, "class", "container mb-9");
    			add_location(footer, file, 89, 4, 2897);
    			add_location(main, file, 73, 0, 2501);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, nav);
    			append_dev(nav, div1);
    			append_dev(div1, i);
    			append_dev(div1, t0);
    			append_dev(div1, a0);
    			append_dev(div1, t2);
    			append_dev(div1, button);
    			append_dev(button, span);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a1);
    			append_dev(ul, t5);
    			append_dev(ul, li1);
    			append_dev(li1, a2);
    			append_dev(ul, t7);
    			append_dev(ul, li2);
    			append_dev(li2, a3);
    			append_dev(ul, t9);
    			append_dev(ul, li3);
    			append_dev(li3, a4);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, main, anchor);
    			if_blocks[current_block_type_index].m(main, null);
    			append_dev(main, t12);
    			append_dev(main, footer);
    			append_dev(footer, p0);
    			append_dev(p0, a5);
    			append_dev(footer, t14);
    			append_dev(footer, p1);
    			append_dev(p1, t15);
    			append_dev(p1, a6);
    			append_dev(p1, t17);
    			append_dev(p1, a7);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(i, "click", /*menuHome*/ ctx[1], false, false, false),
    					listen_dev(a0, "click", /*menuHome*/ ctx[1], false, false, false),
    					listen_dev(a1, "click", /*menuHome*/ ctx[1], false, false, false),
    					listen_dev(a2, "click", /*menuProduct*/ ctx[2], false, false, false),
    					listen_dev(a3, "click", /*menuInquiry*/ ctx[3], false, false, false),
    					listen_dev(a4, "click", /*menuAbout*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(main, t12);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $swMenu;
    	validate_store(swMenu, "swMenu");
    	component_subscribe($$self, swMenu, $$value => $$invalidate(0, $swMenu = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let menu = 1;

    	function menuHome() {
    		swMenu.set(0);
    	}

    	function menuProduct() {
    		swMenu.set(1);
    	}

    	function menuInquiry() {
    		swMenu.set(2);
    	}

    	function menuAbout() {
    		swMenu.set(3);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		swMenu,
    		Home,
    		Product,
    		Item,
    		Inquiry,
    		About,
    		menu,
    		menuHome,
    		menuProduct,
    		menuInquiry,
    		menuAbout,
    		$swMenu
    	});

    	$$self.$inject_state = $$props => {
    		if ("menu" in $$props) menu = $$props.menu;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$swMenu, menuHome, menuProduct, menuInquiry, menuAbout];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		ready: false,
    	}
    });

    window.initMap = function ready() {
    	app.$set({ ready: true });
    };

    return app;

}());
//# sourceMappingURL=bundle.js.map
