"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var events_1 = require("events");
var TreeView = (function (_super) {
    __extends(TreeView, _super);
    function TreeView(container, options) {
        var _this = _super.call(this) || this;
        _this.onClick = function (event) {
            // Toggle groups
            var element = event.target;
            if (element.className === "toggle") {
                if (element.parentElement.tagName === "LI" && element.parentElement.classList.contains("group")) {
                    element.parentElement.classList.toggle("collapsed");
                    return;
                }
            }
            // Update selection
            if (element.tagName === "BUTTON" || element.tagName === "INPUT" || element.tagName === "SELECT")
                return;
            if (_this.updateSelection(event))
                _this.emit("selectionChange", event);
        };
        _this.onDoubleClick = function (event) {
            if (_this.selectedNodes.length !== 1)
                return;
            var element = event.target;
            if (element.tagName === "BUTTON" || element.tagName === "INPUT" || element.tagName === "SELECT")
                return;
            if (element.className === "toggle")
                return;
            _this.emit("activate");
        };
        _this.onKeyDown = function (event) {
            if (document.activeElement !== _this.treeRoot)
                return;
            if (_this.firstSelectedNode == null) {
                // TODO: Remove once we have this.focusedNode
                if (event.keyCode === 40) {
                    _this.addToSelection(_this.treeRoot.firstElementChild);
                    _this.emit("selectionChange");
                    event.preventDefault();
                }
                return;
            }
            switch (event.keyCode) {
                case 38: // up
                case 40:
                    _this.moveVertically(event.keyCode === 40 ? 1 : -1);
                    event.preventDefault();
                    break;
                case 37: // left
                case 39:
                    _this.moveHorizontally(event.keyCode === 39 ? 1 : -1);
                    event.preventDefault();
                    break;
                case 13:
                    if (_this.selectedNodes.length !== 1)
                        return;
                    _this.emit("activate");
                    event.preventDefault();
                    break;
            }
        };
        _this.moveHorizontally = function (offset) {
            // TODO: this.focusedNode;
            var node = _this.firstSelectedNode;
            if (offset === -1) {
                if (!node.classList.contains("group") || node.classList.contains("collapsed")) {
                    if (!node.parentElement.classList.contains("children"))
                        return;
                    node = node.parentElement.previousElementSibling;
                }
                else if (node.classList.contains("group")) {
                    node.classList.add("collapsed");
                }
            }
            else {
                if (node.classList.contains("group")) {
                    if (node.classList.contains("collapsed"))
                        node.classList.remove("collapsed");
                    else
                        node = node.nextSibling.firstChild;
                }
            }
            if (node == null)
                return;
            _this.clearSelection();
            _this.addToSelection(node);
            _this.scrollIntoView(node);
            _this.emit("selectionChange");
        };
        _this.onDragStart = function (event) {
            var element = event.target;
            if (element.tagName !== "LI")
                return false;
            if (!element.classList.contains("item") && !element.classList.contains("group"))
                return false;
            if (_this.selectedNodes.indexOf(element) === -1) {
                _this.clearSelection();
                _this.addToSelection(element);
                _this.emit("selectionChange");
            }
            if (_this.dragStartCallback != null && !_this.dragStartCallback(event, element))
                return false;
            _this.isDraggingNodes = true;
            return true;
        };
        _this.onDragEnd = function (event) {
            _this.isDraggingNodes = false;
        };
        _this.onDragOver = function (event) {
            var dropLocation = _this.getDropLocation(event);
            // Prevent dropping onto null
            if (dropLocation == null)
                return false;
            // If we're dragging nodes from the current tree view
            // Prevent dropping into descendant
            if (_this.isDraggingNodes) {
                if (dropLocation.where === "inside" && _this.selectedNodes.indexOf(dropLocation.target) !== -1)
                    return false;
                for (var _i = 0, _a = _this.selectedNodes; _i < _a.length; _i++) {
                    var selectedNode = _a[_i];
                    if (selectedNode.classList.contains("group") && selectedNode.nextSibling.contains(dropLocation.target))
                        return false;
                }
            }
            _this.hasDraggedOverAfterLeaving = true;
            _this.clearDropClasses();
            dropLocation.target.classList.add("drop-" + dropLocation.where);
            event.preventDefault();
        };
        _this.onDragLeave = function (event) {
            _this.hasDraggedOverAfterLeaving = false;
            setTimeout(function () { if (!_this.hasDraggedOverAfterLeaving)
                _this.clearDropClasses(); }, 300);
        };
        _this.onDrop = function (event) {
            event.preventDefault();
            var dropLocation = _this.getDropLocation(event);
            if (dropLocation == null)
                return;
            _this.clearDropClasses();
            if (!_this.isDraggingNodes) {
                _this.dropCallback(event, dropLocation, null);
                return false;
            }
            var children = _this.selectedNodes[0].parentElement.children;
            var orderedNodes = [];
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (_this.selectedNodes.indexOf(child) !== -1)
                    orderedNodes.push(child);
            }
            var reparent = (_this.dropCallback != null) ? _this.dropCallback(event, dropLocation, orderedNodes) : true;
            if (!reparent)
                return;
            var newParent;
            var referenceElt;
            switch (dropLocation.where) {
                case "inside":
                    if (!dropLocation.target.classList.contains("group"))
                        return;
                    newParent = dropLocation.target.nextSibling;
                    referenceElt = null;
                    break;
                case "below":
                    newParent = dropLocation.target.parentElement;
                    referenceElt = dropLocation.target.nextSibling;
                    if (referenceElt != null && referenceElt.tagName === "OL")
                        referenceElt = referenceElt.nextSibling;
                    break;
                case "above":
                    newParent = dropLocation.target.parentElement;
                    referenceElt = dropLocation.target;
                    break;
            }
            var draggedChildren;
            for (var _i = 0, orderedNodes_1 = orderedNodes; _i < orderedNodes_1.length; _i++) {
                var selectedNode = orderedNodes_1[_i];
                if (selectedNode.classList.contains("group")) {
                    draggedChildren = selectedNode.nextSibling;
                    draggedChildren.parentElement.removeChild(draggedChildren);
                }
                if (referenceElt === selectedNode) {
                    referenceElt = selectedNode.nextSibling;
                }
                selectedNode.parentElement.removeChild(selectedNode);
                newParent.insertBefore(selectedNode, referenceElt);
                referenceElt = selectedNode.nextSibling;
                if (draggedChildren != null) {
                    newParent.insertBefore(draggedChildren, referenceElt);
                    referenceElt = draggedChildren.nextSibling;
                }
            }
        };
        if (options == null)
            options = {};
        _this.multipleSelection = (options.multipleSelection != null) ? options.multipleSelection : true;
        _this.dragStartCallback = options.dragStartCallback;
        _this.dropCallback = options.dropCallback;
        _this.treeRoot = document.createElement("ol");
        _this.treeRoot.tabIndex = 0;
        _this.treeRoot.classList.add("tree");
        container.appendChild(_this.treeRoot);
        _this.selectedNodes = [];
        _this.firstSelectedNode = null;
        _this.treeRoot.addEventListener("click", _this.onClick);
        _this.treeRoot.addEventListener("dblclick", _this.onDoubleClick);
        _this.treeRoot.addEventListener("keydown", _this.onKeyDown);
        container.addEventListener("keydown", function (event) {
            if (event.keyCode === 37 || event.keyCode === 39)
                event.preventDefault();
        });
        if (_this.dragStartCallback != null) {
            _this.treeRoot.addEventListener("dragstart", _this.onDragStart);
            _this.treeRoot.addEventListener("dragend", _this.onDragEnd);
        }
        if (_this.dropCallback != null) {
            _this.treeRoot.addEventListener("dragover", _this.onDragOver);
            _this.treeRoot.addEventListener("dragleave", _this.onDragLeave);
            _this.treeRoot.addEventListener("drop", _this.onDrop);
        }
        return _this;
    }
    TreeView.prototype.clearSelection = function () {
        for (var _i = 0, _a = this.selectedNodes; _i < _a.length; _i++) {
            var selectedNode = _a[_i];
            if (selectedNode)
                selectedNode.classList.remove("selected");
        }
        this.selectedNodes.length = 0;
        this.firstSelectedNode = null;
    };
    TreeView.prototype.addToSelection = function (element) {
        if (this.selectedNodes.indexOf(element) !== -1)
            return;
        this.selectedNodes.push(element);
        element.classList.add("selected");
        if (this.selectedNodes.length === 1)
            this.firstSelectedNode = element;
    };
    TreeView.prototype.scrollIntoView = function (element) {
        var ancestor = element.parentElement;
        while (ancestor != null && ancestor.className === "children") {
            ancestor.previousElementSibling.classList.remove("collapsed");
            ancestor = ancestor.parentElement;
        }
        var elementRect = element.getBoundingClientRect();
        var containerRect = this.treeRoot.parentElement.getBoundingClientRect();
        if (elementRect.top < containerRect.top)
            element.scrollIntoView(true);
        else if (elementRect.bottom > containerRect.bottom)
            element.scrollIntoView(false);
    };
    TreeView.prototype.clear = function () {
        this.treeRoot.innerHTML = "";
        this.selectedNodes.length = 0;
        this.firstSelectedNode = null;
        this.hasDraggedOverAfterLeaving = false;
        this.isDraggingNodes = false;
    };
    TreeView.prototype.append = function (element, type, parentGroupElement) {
        if (type !== "item" && type !== "group")
            throw new Error("Invalid type");
        var childrenElt;
        var siblingsElt;
        if (parentGroupElement != null) {
            if (parentGroupElement.tagName !== "LI" || !parentGroupElement.classList.contains("group"))
                throw new Error("Invalid parent group");
            siblingsElt = parentGroupElement.nextSibling;
        }
        else {
            siblingsElt = this.treeRoot;
        }
        if (!element.classList.contains(type)) {
            element.classList.add(type);
            if (this.dragStartCallback != null)
                element.draggable = true;
            if (type === "group") {
                var toggleElt = document.createElement("div");
                toggleElt.classList.add("toggle");
                element.insertBefore(toggleElt, element.firstChild);
                childrenElt = document.createElement("ol");
                childrenElt.classList.add("children");
            }
        }
        else if (type === "group") {
            childrenElt = element.nextSibling;
        }
        siblingsElt.appendChild(element);
        if (childrenElt != null)
            siblingsElt.appendChild(childrenElt);
        return element;
    };
    TreeView.prototype.insertBefore = function (element, type, referenceElement) {
        if (type !== "item" && type !== "group")
            throw new Error("Invalid type");
        if (referenceElement == null)
            throw new Error("A reference element is required");
        if (referenceElement.tagName !== "LI")
            throw new Error("Invalid reference element");
        var childrenElt;
        if (!element.classList.contains(type)) {
            element.classList.add(type);
            if (this.dragStartCallback != null)
                element.draggable = true;
            if (type === "group") {
                var toggleElt = document.createElement("div");
                toggleElt.classList.add("toggle");
                element.insertBefore(toggleElt, element.firstChild);
                childrenElt = document.createElement("ol");
                childrenElt.classList.add("children");
            }
        }
        else if (type === "group") {
            childrenElt = element.nextSibling;
        }
        referenceElement.parentElement.insertBefore(element, referenceElement);
        if (childrenElt != null)
            referenceElement.parentElement.insertBefore(childrenElt, element.nextSibling);
        return element;
    };
    TreeView.prototype.insertAt = function (element, type, index, parentElement) {
        var referenceElt;
        if (index != null) {
            referenceElt =
                (parentElement != null)
                    ? parentElement.nextSibling.querySelector(":scope > li:nth-of-type(" + (index + 1) + ")")
                    : this.treeRoot.querySelector(":scope > li:nth-of-type(" + (index + 1) + ")");
        }
        if (referenceElt != null)
            this.insertBefore(element, type, referenceElt);
        else
            this.append(element, type, parentElement);
    };
    TreeView.prototype.remove = function (element) {
        var selectedIndex = this.selectedNodes.indexOf(element);
        if (selectedIndex !== -1) {
            element.classList.remove("selected");
            this.selectedNodes.splice(selectedIndex, 1);
        }
        if (this.firstSelectedNode === element)
            this.firstSelectedNode = this.selectedNodes[0];
        if (element.classList.contains("group")) {
            var childrenElement = element.nextSibling;
            var removedSelectedNodes = [];
            for (var _i = 0, _a = this.selectedNodes; _i < _a.length; _i++) {
                var selectedNode = _a[_i];
                if (childrenElement.contains(selectedNode)) {
                    removedSelectedNodes.push(selectedNode);
                }
            }
            for (var _b = 0, removedSelectedNodes_1 = removedSelectedNodes; _b < removedSelectedNodes_1.length; _b++) {
                var removedSelectedNode = removedSelectedNodes_1[_b];
                removedSelectedNode.classList.remove("selected");
                this.selectedNodes.splice(this.selectedNodes.indexOf(removedSelectedNode), 1);
                if (this.firstSelectedNode === removedSelectedNode)
                    this.firstSelectedNode = this.selectedNodes[0];
            }
            element.parentElement.removeChild(childrenElement);
        }
        element.parentElement.removeChild(element);
    };
    // Returns whether the selection changed
    TreeView.prototype.updateSelection = function (event) {
        var selectionChanged = false;
        if ((!this.multipleSelection || (!event.shiftKey && !event.ctrlKey)) && this.selectedNodes.length > 0) {
            this.clearSelection();
            selectionChanged = true;
        }
        var ancestorElement = event.target;
        while (ancestorElement.tagName !== "LI" || (!ancestorElement.classList.contains("item") && !ancestorElement.classList.contains("group"))) {
            if (ancestorElement === this.treeRoot)
                return selectionChanged;
            ancestorElement = ancestorElement.parentElement;
        }
        var element = ancestorElement;
        if (this.selectedNodes.length > 0 && this.selectedNodes[0].parentElement !== element.parentElement) {
            return selectionChanged;
        }
        if (this.multipleSelection && event.shiftKey && this.selectedNodes.length > 0) {
            var startElement = this.firstSelectedNode;
            var elements = [];
            var inside = false;
            for (var i = 0; i < element.parentElement.children.length; i++) {
                var child = element.parentElement.children[i];
                if (child === startElement || child === element) {
                    if (inside || startElement === element) {
                        elements.push(child);
                        break;
                    }
                    inside = true;
                }
                if (inside && child.tagName === "LI")
                    elements.push(child);
            }
            this.clearSelection();
            this.selectedNodes = elements;
            this.firstSelectedNode = startElement;
            for (var _i = 0, _a = this.selectedNodes; _i < _a.length; _i++) {
                var selectedNode = _a[_i];
                selectedNode.classList.add("selected");
            }
            return true;
        }
        var index;
        if (event.ctrlKey && (index = this.selectedNodes.indexOf(element)) !== -1) {
            this.selectedNodes.splice(index, 1);
            element.classList.remove("selected");
            if (this.firstSelectedNode === element) {
                this.firstSelectedNode = this.selectedNodes[0];
            }
            return true;
        }
        this.addToSelection(element);
        return true;
    };
    TreeView.prototype.moveVertically = function (offset) {
        // TODO: this.focusedNode;
        var node = this.firstSelectedNode;
        if (offset === -1) {
            if (node.previousElementSibling != null) {
                var target = node.previousElementSibling;
                while (target.classList.contains("children")) {
                    if (!target.previousElementSibling.classList.contains("collapsed") && target.childElementCount > 0)
                        target = target.lastElementChild;
                    else
                        target = target.previousElementSibling;
                }
                node = target;
            }
            else if (node.parentElement.classList.contains("children"))
                node = node.parentElement.previousElementSibling;
            else
                return;
        }
        else {
            var walkUp = false;
            if (node.classList.contains("group")) {
                if (!node.classList.contains("collapsed") && node.nextElementSibling.childElementCount > 0)
                    node = node.nextElementSibling.firstElementChild;
                else if (node.nextElementSibling.nextElementSibling != null)
                    node = node.nextElementSibling.nextElementSibling;
                else
                    walkUp = true;
            }
            else {
                if (node.nextElementSibling != null)
                    node = node.nextElementSibling;
                else
                    walkUp = true;
            }
            if (walkUp) {
                if (node.parentElement.classList.contains("children")) {
                    var target = node.parentElement;
                    while (target.nextElementSibling == null) {
                        target = target.parentElement;
                        if (!target.classList.contains("children"))
                            return;
                    }
                    node = target.nextElementSibling;
                }
                else
                    return;
            }
        }
        if (node == null)
            return;
        this.clearSelection();
        this.addToSelection(node);
        this.scrollIntoView(node);
        this.emit("selectionChange");
    };
    ;
    TreeView.prototype.getDropLocation = function (event) {
        var element = event.target;
        if (element.tagName === "OL" && element.classList.contains("children")) {
            element = element.parentElement;
        }
        if (element === this.treeRoot) {
            element = element.lastChild;
            if (element == null)
                return { target: this.treeRoot, where: "inside" };
            if (element.tagName === "OL")
                element = element.previousSibling;
            return { target: element, where: "below" };
        }
        while (element.tagName !== "LI" || (!element.classList.contains("item") && !element.classList.contains("group"))) {
            if (element === this.treeRoot)
                return null;
            element = element.parentElement;
        }
        var where = this.getInsertionPoint(element, event.pageY);
        if (where === "below") {
            if (element.classList.contains("item") && element.nextSibling != null && element.nextSibling.tagName === "LI") {
                element = element.nextSibling;
                where = "above";
            }
            else if (element.classList.contains("group") && element.nextSibling.nextSibling != null && element.nextSibling.nextSibling.tagName === "LI") {
                element = element.nextSibling.nextSibling;
                where = "above";
            }
        }
        return { target: element, where: where };
    };
    TreeView.prototype.getInsertionPoint = function (element, y) {
        var rect = element.getBoundingClientRect();
        var offset = y - rect.top;
        if (offset < rect.height / 4)
            return "above";
        if (offset > rect.height * 3 / 4)
            return (element.classList.contains("group") && element.nextSibling.childElementCount > 0) ? "inside" : "below";
        return element.classList.contains("item") ? "below" : "inside";
    };
    TreeView.prototype.clearDropClasses = function () {
        var dropAbove = this.treeRoot.querySelector(".drop-above");
        if (dropAbove != null)
            dropAbove.classList.remove("drop-above");
        var dropInside = this.treeRoot.querySelector(".drop-inside");
        if (dropInside != null)
            dropInside.classList.remove("drop-inside");
        var dropBelow = this.treeRoot.querySelector(".drop-below");
        if (dropBelow != null)
            dropBelow.classList.remove("drop-below");
        // For the rare case where we're dropping a foreign item into an empty tree view
        this.treeRoot.classList.remove("drop-inside");
    };
    return TreeView;
}(events_1.EventEmitter));
module.exports = TreeView;
