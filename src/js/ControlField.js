(function($) {

    var Alpaca = $.alpaca;

    Alpaca.ControlField = Alpaca.Field.extend(
    /**
     * @lends Alpaca.ControlField.prototype
     */
    {
        /**
         * Called during construction to signal that this field is a control field.
         */
        onConstruct: function()
        {
            var _this = this;

            this.isControlField = true;

            // helper method for getting val() from the control
            // handles conversion to the correct scalar type
            this._getControlVal = function(ensureProperType) {
                var val = null;

                if (this.control)
                {
                    val = $(this.control).val();

                    if (ensureProperType)
                    {
                        val = _this.ensureProperType(val);
                    }
                }

                return val;
            };
        },

        /**
         * @see Alpaca.Field#setup
         */
        setup: function()
        {
            var self = this;

            this.base();

            var controlTemplateType = self.resolveControlTemplateType();
            if (!controlTemplateType)
            {
                return Alpaca.throwErrorWithCallback("Unable to find template descriptor for control: " + self.getFieldType());
            }

            this.controlDescriptor = this.view.getTemplateDescriptor("control-" + controlTemplateType, self);

            // buttons
            if (typeof(this.options.renderButtons) === "undefined")
            {
                this.options.renderButtons = true;
            }
            if (this.options.buttons)
            {
                for (var k in this.options.buttons)
                {
                    if (this.options.buttons[k].label)
                    {
                        this.options.buttons[k].value = this.options.buttons[k].label;
                    }
                    if (this.options.buttons[k].title)
                    {
                        this.options.buttons[k].value = this.options.buttons[k].title;
                    }
                    if (!this.options.buttons[k].type)
                    {
                        this.options.buttons[k].type = "button";
                    }
                    if (!this.options.buttons[k].styles)
                    {
                        this.options.buttons[k].styles = this.view.styles.button;
                    }
                }
            }
        },

        getControlEl: function()
        {
            return this.control;
        },

        resolveControlTemplateType: function()
        {
            var self = this;

            // we assume the field type and then check the view to see if there is a template for this view
            // if not, we walk the parent chain until we find a template type

            var finished = false;
            var selectedType = null;

            var b = this;
            do
            {
                if (!b.getFieldType)
                {
                    finished = true;
                }
                else
                {
                    var d = this.view.getTemplateDescriptor("control-" + b.getFieldType(), self);
                    if (d)
                    {
                        selectedType = b.getFieldType();
                        finished = true;
                    }
                    else
                    {
                        b = b.constructor.ancestor.prototype;
                    }
                }
            }
            while (!finished);

            return selectedType;
        },

        onSetup: function()
        {

        },

        isAutoFocusable: function()
        {
            return true;
        },

        /**
         * For control fields, we use the "control" template as the primary.
         *
         * @see Alpaca.Field#getTemplateDescriptorId
         * @returns {string}
         */
        getTemplateDescriptorId : function ()
        {
            return "control";
        },

        /**
         * Add a "control" dom element inside of the field which houses our custom control.
         *
         * @see Alpaca.Field#renderField
         */
        renderFieldElements: function(callback) {

            var self = this;

            // find our insertion point
            // this is marked by the handlebars helper
            this.control = $(this.field).find("." + Alpaca.MARKER_CLASS_CONTROL_FIELD);
            this.control.removeClass(Alpaca.MARKER_CLASS_CONTROL_FIELD);

            // render
            self.prepareControlModel(function(model) {
                self.beforeRenderControl(model, function() {
                    self.renderControl(model, function(controlField) {

                        if (controlField)
                        {
                            self.control.replaceWith(controlField);
                            self.control = controlField;

                            self.control.addClass(Alpaca.CLASS_CONTROL);
                        }

                        // CALLBACK: "control"
                        self.fireCallback("control");

                        self.afterRenderControl(model, function() {

                            callback();
                        });

                    });
                });
            });
        },

        /**
         * Prepares the model for use in rendering the control.
         *
         * @param callback function(model)
         */
        prepareControlModel: function(callback)
        {
            var self = this;

            var model = {};
            model.id = this.getId();
            model.name = this.name;
            model.options = this.options;
            model.schema = this.schema;
            model.data = this.data;
            model.required = this.isRequired();
            model.view = this.view;

            callback(model);
        },

        /**
         * Gets schema enum property.
         *
         * @returns {Array|String} Field schema enum property.
         */
        getEnum: function()
        {
            if (this.schema && this.schema.enum)
            {
                return this.schema.enum;
            }
            else if (this.schema && this.schema.items && this.schema.items.enum)
            {
                return this.schema.items.enum;
            }
        },

        /**
         * Updates the schema enum property.
         *
         * @returns {Array|String} Field schema enum property.
         */
        updateEnum: function(newEnum)
        {
            if (this.schema && this.schema.enum)
            {
                this.schema.enum = newEnum;
            }
            else if (this.schema && this.schema.items && this.schema.items.enum)
            {
                this.schema.items.enum = newEnum;
            }
        },

        /**
         * Called before the control is rendered.
         *
         * @extension-point
         *
         * @param callback
         */
        beforeRenderControl: function(model, callback)
        {
            var self = this;

            callback();
        },

        /**
         * Called after the control is rendered.
         *
         * @extension-point
         *
         * @param model
         * @param callback
         */
        afterRenderControl: function(model, callback)
        {
            var self = this;

            if (!self.firstUpdateObservableFire)
            {
                if ((typeof(self.data) == "undefined") || self.data == null)
                {
                    // do not handle
                }
                else
                {
                    self.firstUpdateObservableFire = true;
                    self.updateObservable();
                }
            }

            // buttons
            $(this.getFieldEl()).find(".alpaca-control-button").each(function() {

                $(this).click(function(e) {
                    $(this).attr("button-pushed", true);
                });

                // custom click handler?
                var key = $(this).attr("data-key");
                if (key)
                {
                    var buttonConfig = self.options.buttons[key];
                    if (buttonConfig)
                    {
                        if (buttonConfig.click)
                        {
                            $(this).click(function(control, handler) {
                                return function(e) {
                                    e.preventDefault();
                                    handler.call(control, e);
                                }
                            }(self, buttonConfig.click));
                        }
                    }
                }
            });


            callback();
        },

        /**
         * Renders the control into the field container.
         *
         * @extension-point
         *
         * @param model
         * @param callback
         */
        renderControl: function(model, callback)
        {
            var control = null;

            if (this.controlDescriptor)
            {
                control = Alpaca.tmpl(this.controlDescriptor, model);
            }

            callback(control);
        },

        /**
         * @see Alpaca.Field#postRender
         */
        postRender: function(callback)
        {
            var self = this;

            /*
            // store reference to the label
            this.labelDiv = $(this.field).find(".alpaca-controlfield-label");
            var labelDiv = $('.alpaca-controlfield-label', this.outerEl);
            if (labelDiv.length) {
                this.labelDiv = labelDiv;
            }

            var helperDiv = $('.alpaca-controlfield-helper', this.outerEl);
            if (helperDiv.length) {
                this.helperDiv = helperDiv;
            }
            */

            this.base(function() {

                callback();

            });
        },

        /**
         * Ensures that the "name" property on the control is kept in sync.
         */
        updateDOMElement: function()
        {
            this.base();

            // update the name field
            this.control.attr("name", this.getName());
        },

        /**
         * @see Alpaca.Field#setDefault
         */
        setDefault: function() {
            var defaultData = Alpaca.isEmpty(this.schema['default']) ? "" : this.schema['default'];
            this.setValue(defaultData);
        },

        /**
         * Returns the value of this field.
         *
         * @returns {Any} value Field value.
         */
        getValue: function()
        {
            var self = this;

            var value = this.base();

            if (!this.isDisplayOnly())
            {
                value = self.getControlValue();
            }

            // some correction for type
            value = self.ensureProperType(value);

            return value;
        },

        /**
         * Extension point
         */
        getControlValue: function()
        {
            return this._getControlVal(true);
        },

        /**
         * Validate against enum property.
         *
         * @returns {Boolean} True if the element value is part of the enum list, false otherwise.
         */
        _validateEnum: function()
        {
            if (this.getEnum()) {
                var val = this.data;
                val = this.getValue();
                /*this.getValue();*/
                if (!this.isRequired() && Alpaca.isValEmpty(val)) {
                    return true;
                }
                if ($.inArray(val, this.getEnum()) > -1) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return true;
            }
        },

        /**
         * @see Alpaca.Field#handleValidate
         */
        handleValidate: function()
        {
            var baseStatus = this.base();

            var valInfo = this.validation;

            var status = this._validateEnum();

            // Use the values presented to the user in the validation
            // error message. If there are optionLabels, use them in
            // preference to the raw enum values.
            var values = this.getEnum();
            if (typeof(this.options["optionLabels"]) === "object" && values.length && this.options["optionLabels"].length >= values.length) {
                values = this.options["optionLabels"].slice(0, values.length);
            }

            valInfo["invalidValueOfEnum"] = {
                "message": status ? "" : Alpaca.substituteTokens(this.getMessage("invalidValueOfEnum"), [values.join(', '), this.data]),
                "status": status
            };

            return baseStatus && valInfo["invalidValueOfEnum"]["status"];
        },

        /**
         * @see Alpaca.Field#initEvents
         */
        initEvents: function()
        {
            this.base();

            if (this.control && this.control.length > 0)
            {
                this.initControlEvents();
            }
        },

        initControlEvents: function()
        {
            var self = this;

            var control = this.control;

            control.click(function(e) {
                self.onClick.call(self, e);
                self.trigger("click", e);
            });

            // trigger control level handlers for things that happen to input element
            control.change(function(e) {

                // we use a timeout here because we want this to run AFTER control click handlers
                setTimeout(function() {
                    self.onChange.call(self, e);
                    self.triggerWithPropagation("change", e);
                }, 200);
            });

            control.focus(function(e) {

                self.wasFocused = true;

                if (!self.suspendBlurFocus)
                {
                    var x = self.onFocus.call(self, e);
                    if (x !== false) {
                        x = self.trigger("focus", e);
                    }

                    return x;
                }
            });

            control.blur(function(e) {

                self.wasBlurred = true;

                if (!self.suspendBlurFocus)
                {
                    var x = self.onBlur.call(self, e);
                    if (x !== false) {
                        x = self.trigger("blur", e);
                    }

                    return x;
                }
            });

            control.keypress(function(e) {
                var x = self.onKeyPress.call(self, e);
                if (x !== false) {
                    x = self.trigger("keypress", e);
                }

                return x;
            });

            control.keyup(function(e) {
                var x = self.onKeyUp.call(self, e);
                if (x !== false) {
                    x = self.trigger("keyup", e);
                }

                return x;
            });

            control.keydown(function(e) {
                var x = self.onKeyDown.call(self, e);
                if (x !== false) {
                    x = self.trigger("keydown", e);
                }

                return x;
            });
        },

        /**
         * Callback for when a key press event is received for the field control.
         *
         * @param {Object} e keypress event
         */
        onKeyPress: function(e)
        {
            var self = this;

            var refresh = false;

            // if we're in edit mode
            if (self.view.type && self.view.type === 'edit')
            {
                // if the field is currently invalid, then we provide early feedback to the user as to when they enter
                // if the field was valid, we don't render invalidation feedback until they blur the field

                // was the control valid previously?
                var wasValid = this.isValid();
                if (!wasValid)
                {
                    refresh = true;
                }
            }
            else if (self.view.type && self.view.type === 'create')
            {
                var wasValid = this.isValid();
                if (!wasValid && self.wasBlurred)
                {
                    refresh = true;
                }
            }

            if (refresh)
            {
                // we use a timeout because at this exact moment, the value of the control is still the old value
                // jQuery raises the keypress event ahead of the input receiving the new data which would incorporate
                // the key that was pressed
                //
                // this timeout provides the browser with enough time to plug the value into the input control
                // which the validation logic uses to determine whether the control is now in a valid state
                //
                window.setTimeout(function () {
                    self.refreshValidationState();
                }, 50);
            }

        },

        /**
         * Callback for when a key down event is received for the field control.
         *
         * @param {Object} e keydown event
         */
        onKeyDown: function(e)
        {
        },

        /**
         * Callback for when a key up event is received for the field control.
         *
         * @param {Object} e keyup event
         */
        onKeyUp: function(e)
        {
        },

        /**
         * Handler for click event.
         *
         * @param {Object} e Click event.
         */
        onClick: function(e)
        {
        },

        /**
         * @see Alpaca.Field#disable
         */
        disable: function()
        {
            this.base();

            if (this.control && this.control.length > 0)
            {
                $(this.control).prop("disabled", true);
            }
        },

        /**
         * @see Alpaca.Field#enable
         */
        enable: function()
        {
            this.base();

            if (this.control && this.control.length > 0)
            {
                $(this.control).prop("disabled", false);
            }
        },

        /**
         * Sorts the schema.enum and options.optionLabels into a display order that is described by sortSelectableOptions().
         * This ensures that drop down values are in some sensible display order (alphabetical / numeric) for the end user.
         */
        sortEnum: function()
        {
            var self = this;
            var schemaEnum = self.getEnum();

            if (schemaEnum && schemaEnum.length > 0)
            {
                var selectableOptions = [];

                for (var i = 0; i < schemaEnum.length; i++)
                {
                    var value = schemaEnum[i];
                    var text = schemaEnum[i];

                    if (self.options && self.options.optionLabels && self.options.optionLabels.length >= i + 1)
                    {
                        text = self.options.optionLabels[i];
                    }

                    selectableOptions.push({
                        "value": value,
                        "text": text
                    });
                }

                // sort it
                self.sortSelectableOptions(selectableOptions);

                // now set back
                schemaEnum = [];
                self.options.optionLabels = [];
                for (var i = 0; i < selectableOptions.length; i++)
                {
                    schemaEnum.push(selectableOptions[i].value);
                    self.options.optionLabels.push(selectableOptions[i].text);
                }
                self.updateEnum(schemaEnum);
            }
        },

        /**
         * Sorts a select options array by order of displayable text.
         *
         * If you're looking to provide a custom sort order, you may wish to override this function.
         * Alternatively, you can provide an options.sort function - fn(a, b).
         *
         * @param selectableOptions
         */
        sortSelectableOptions: function(selectableOptions)
        {
            var self = this;

            // if sort is false, just return
            if (self.options.sort === false)
            {
                return;
            }

            // assume a default sort function
            var sortFn = Alpaca.defaultSort;

            // if they provide a custom sort function, use that instead
            if (self.options.sort) {
                if (typeof(self.options.sort) === "function") {
                    sortFn = self.options.sort;
                }
            }

            // sort it
            selectableOptions.sort(sortFn);
        },

        /**
         * Helper function that invokes a datasource configured for this control.  The results are written into the
         * given array and the onFinish method is then called with (err, array).
         *
         * @param array
         * @param onFinish
         */
        invokeDataSource: function(array, model, onFinish)
        {
            var self = this;

            var completionFunction = function(err)
            {
                var self = this;

                if (err) {
                    return onFinish(err);
                }

                self.afterLoadDataSourceOptions(array, model, function(err, array) {

                    if (err) {
                        return onFinish(err);
                    }

                    // apply sorting to whatever we produce
                    self.sortSelectableOptions(array);

                    onFinish(null, array);

                });

            }.bind(self);

            if (Alpaca.isFunction(self.options.dataSource))
            {
                self.options.dataSource.call(self, function(values) {

                    if (Alpaca.isArray(values))
                    {
                        for (var i = 0; i < values.length; i++)
                        {
                            if (typeof(values[i]) === "string")
                            {
                                array.push({
                                    "text": values[i],
                                    "value": values[i]
                                });
                            }
                            else if (Alpaca.isObject(values[i]))
                            {
                                array.push(values[i]);
                            }
                        }

                        completionFunction();
                    }
                    else if (Alpaca.isObject(values))
                    {
                        for (var k in values)
                        {
                            array.push({
                                "text": k,
                                "value": values[k]
                            });
                        }

                        completionFunction();
                    }
                    else
                    {
                        completionFunction();
                    }
                });
            }
            else if (Alpaca.isUri(self.options.dataSource))
            {
                $.ajax({
                    url: self.options.dataSource,
                    type: "get",
                    dataType: "json",
                    success: function(jsonDocument) {

                        var ds = jsonDocument;
                        if (self.options.dsTransformer && Alpaca.isFunction(self.options.dsTransformer))
                        {
                            ds = self.options.dsTransformer(ds);
                        }

                        if (ds)
                        {
                            if (Alpaca.isObject(ds))
                            {
                                // for objects, we walk through one key at a time
                                // the insertion order is the order of the keys from the map
                                // to preserve order, consider using an array as below
                                $.each(ds, function(key, value) {
                                    array.push({
                                        "value": key,
                                        "text": value
                                    });
                                });

                                completionFunction();
                            }
                            else if (Alpaca.isArray(ds))
                            {
                                // for arrays, we walk through one index at a time
                                // the insertion order is dictated by the order of the indices into the array
                                // this preserves order
                                $.each(ds, function(index, value) {
                                    array.push({
                                        "value": value.value,
                                        "text": value.text
                                    });
                                });

                                completionFunction();
                            }
                        }
                    },
                    "error": function(jqXHR, textStatus, errorThrown) {

                        self.errorCallback({
                            "message":"Unable to load data from uri : " + self.options.dataSource,
                            "stage": "DATASOURCE_LOADING_ERROR",
                            "details": {
                                "jqXHR" : jqXHR,
                                "textStatus" : textStatus,
                                "errorThrown" : errorThrown
                            }
                        });
                    }
                });
            }
            else if (Alpaca.isArray(self.options.dataSource))
            {
                for (var i = 0; i < self.options.dataSource.length; i++)
                {
                    if (typeof(self.options.dataSource[i]) === "string")
                    {
                        array.push({
                            "text": self.options.dataSource[i],
                            "value": self.options.dataSource[i]
                        });
                    }
                    else if (Alpaca.isObject(self.options.dataSource[i]))
                    {
                        array.push(self.options.dataSource[i]);
                    }
                }

                completionFunction();
            }
            else if (Alpaca.isObject(self.options.dataSource))
            {
                if (self.options.dataSource.connector)
                {
                    var connector = self.connector;

                    if (Alpaca.isObject(self.options.dataSource.connector))
                    {
                        var connectorId = self.options.dataSource.connector.id;
                        var connectorConfig = self.options.dataSource.connector.config;
                        if (!connectorConfig) {
                            connectorConfig = {};
                        }

                        var ConnectorClass = Alpaca.getConnectorClass(connectorId);
                        if (ConnectorClass) {
                            connector = new ConnectorClass(connectorId, connectorConfig);
                        }
                    }

                    var config = self.options.dataSource.config;
                    if (!config) {
                        config = {};
                    }

                    // load using connector
                    connector.loadDataSource(config, function(values) {

                        for (var i = 0; i < values.length; i++)
                        {
                            if (typeof(values[i]) === "string")
                            {
                                array.push({
                                    "text": values[i],
                                    "value": values[i]
                                });
                            }
                            else if (Alpaca.isObject(values[i]))
                            {
                                array.push(values[i]);
                            }
                        }

                        completionFunction();
                    });
                }
                else
                {
                    // load from standard object
                    for (var k in self.options.dataSource)
                    {
                        array.push({
                            "text": self.options.dataSource[k],
                            "value": k
                        });
                    }

                    completionFunction();
                }

            }
            else
            {
                onFinish();
            }
        },

        afterLoadDataSourceOptions: function(array, model, callback)
        {
            callback(null, array);
        }


        /* builder_helpers */
        ,

        /**
         * @private
         * @see Alpaca.Field#getSchemaOfSchema
         */
        getSchemaOfSchema: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "enum": {
                        "title": "Enumerated Values",
                        "description": "List of specific values for this property",
                        "type": "array"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Field#getOptionsForSchema
         */
        getOptionsForSchema: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "enum": {
                        "itemLabel":"Value",
                        "type": "array"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Field#getSchemaOfOptions
         */
        getSchemaOfOptions: function() {
            return Alpaca.merge(this.base(), {
                "properties": {
                    "name": {
                        "title": "Field Name",
                        "description": "Field Name.",
                        "type": "string"
                    },
                    "sort": {
                        "title": "Sort Function",
                        "description": "Defines an f(a,b) sort function for the array of enumerated values [{text, value}].  This is used to sort enum and optionLabels as well as results that come back from any data sources (for select and radio controls).  By default the items are sorted alphabetically.   Don't apply any sorting if false.",
                        "type": "function"
                    }
                }
            });
        },

        /**
         * @private
         * @see Alpaca.Field#getOptionsForOptions
         */
        getOptionsForOptions: function() {
            return Alpaca.merge(this.base(), {
                "fields": {
                    "name": {
                        "type": "text"
                    }
                }
            });
        }
        /* end_builder_helpers */
    });

    // Registers additional messages
    Alpaca.registerMessages({
        "invalidValueOfEnum": "This field should have one of the values in {0}.  Current value is: {1}"
    });

})(jQuery);
