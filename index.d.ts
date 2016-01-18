declare class TreeView {
  treeRoot: HTMLOListElement;
  selectedNodes: HTMLLIElement[];

  constructor(container: HTMLElement, options?: { dropCallback?: TreeView.DropCallback, multipleSelection?: boolean });
  clearSelection(): void;
  addToSelection(element: HTMLLIElement): void;
  append(element: HTMLLIElement, type: string /* "item" or "group" */, parentGroupElement?: HTMLElement): void;
  insertBefore(element: HTMLLIElement, type: string, referenceElement: HTMLLIElement): void;
  insertAt(element: HTMLLIElement, type: string, index: number, parentElement?: HTMLLIElement): void;
  remove(element: HTMLLIElement): void;

  addListener(event: string, listener: Function): TreeView;
  on(event: string, listener: Function): TreeView;
  once(event: string, listener: Function): TreeView;
  removeListener(event: string, listener: Function): TreeView;
  removeAllListeners(event?: string): TreeView;
  setMaxListeners(n: number): TreeView;
  getMaxListeners(): number;
  listeners(event: string): Function[];
  emit(event: string, ...args: any[]): boolean;
  listenerCount(type: string): number;

  on(event: "selectionChange", listener: () => any): TreeView;
  on(event: "activate", listener: () => any): TreeView;
}

declare namespace TreeView {
  interface DropCallback {
    (dropInfo: {
      target: HTMLLIElement;
      where: string /* "above", "inside" or "below" */;
    },
    orderedNodes: HTMLLIElement[]): boolean;
  }
}

export = TreeView;