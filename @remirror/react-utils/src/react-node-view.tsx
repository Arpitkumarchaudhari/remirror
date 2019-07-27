import React, { ComponentType } from 'react';

import {
  Attrs,
  Cast,
  Decoration,
  EDITOR_CLASS_NAME,
  EditorView,
  EditorViewParams,
  isDOMNode,
  isElementDOMNode,
  isPlainObject,
  isString,
  NodeView,
  NodeViewPortalContainer,
  PlainObject,
  ProsemirrorNode,
} from '@remirror/core';
import { css, Interpolation } from 'emotion';
import { RemirrorProps } from './react-types';

/**
 * Retrieve the position of the current nodeView
 */
export type GetPosition = () => number;

/**
 * A mimic of the css method except that this one does nothing but return an empty string.
 *
 * @remark
 * Used to switch off emotion css injection
 */
const cssNoOp: typeof css = () => '';

export type NodeViewComponentProps<GAttrs = any> = EditorViewParams & {
  node: ProsemirrorNode & { attrs: GAttrs };
  getPosition: GetPosition;
  forwardRef?: (node: HTMLElement) => void | undefined;
};

export interface CreateNodeViewParams<GProps extends PlainObject = {}>
  extends Partial<Pick<RemirrorProps, 'withoutEmotion'>> {
  Component: ComponentType<NodeViewComponentProps & GProps>;
  portalContainer: NodeViewPortalContainer;
  props: GProps;
  style?: Interpolation;
}

export class ReactNodeView<GProps extends PlainObject = {}> implements NodeView {
  public static createNodeView<GProps extends PlainObject>({
    Component,
    portalContainer,
    props,
    style,
    withoutEmotion,
  }: CreateNodeViewParams<GProps>) {
    return (node: ProsemirrorNode, view: EditorView, getPosition: GetPosition) =>
      new ReactNodeView(
        node,
        view,
        getPosition,
        portalContainer,
        props,
        Component,
        style,
        withoutEmotion,
      ).init();
  }

  private domRef?: HTMLElement;
  private contentDOMWrapper: Node | null = null;
  public contentDOM: Node | undefined;

  /**
   * The CSS transformation property depending on whether the emotion is being used or not.
   */
  private get css(): typeof css {
    return this.withoutEmotion ? cssNoOp : css;
  }

  get dom() {
    return this.domRef;
  }

  constructor(
    public node: ProsemirrorNode,
    public view: EditorView,
    private getPosition: GetPosition,
    private portalContainer: NodeViewPortalContainer,
    public props: GProps = {} as GProps,
    private Component: ComponentType<NodeViewComponentProps & GProps>,
    private style: Interpolation = {},
    private withoutEmotion: boolean = false,
  ) {}

  /**
   * This method exists to move initialization logic out of the constructor,
   * so the object can be initialized properly before calling render first time.
   *
   * Example:
   * Instance properties get added to an object only after super call in
   * constructor, which leads to some methods being undefined during the
   * first render.
   */
  public init() {
    this.domRef = this.createDomRef();
    this.setDomAttrs(this.node, this.domRef);

    const { dom: contentDOMWrapper, contentDOM } = this.getContentDOM() || {
      dom: undefined,
      contentDOM: undefined,
    };

    if (this.domRef && contentDOMWrapper) {
      this.domRef.appendChild(contentDOMWrapper);
      this.contentDOM = contentDOM ? contentDOM : contentDOMWrapper;
      this.contentDOMWrapper = contentDOMWrapper || contentDOM;
    }

    // Add a fixed class and a dynamic class to this node (allows for custom styles being added in configuration)
    this.domRef.classList.add(`${EDITOR_CLASS_NAME}-${this.node.type.name}-node-view`, this.css(this.style));

    this.renderReactComponent(() => this.render(this.props, this.handleRef));
    return this;
  }

  private renderReactComponent(render: () => JSX.Element) {
    if (!this.domRef || !render) {
      return;
    }

    this.portalContainer.render({ render, container: this.domRef });
  }

  /**
   * Create a dom ref
   */
  public createDomRef(): HTMLElement {
    const { toDOM } = this.node.type.spec;

    if (toDOM) {
      const domSpec = toDOM(this.node);
      if (isString(domSpec)) {
        return document.createElement(domSpec);
      }

      if (isDOMNode(domSpec)) {
        if (!isElementDOMNode(domSpec)) {
          throw new Error('Invalid HTML Element provided in the DOM Spec');
        }
        return domSpec;
      }

      // Use the outer element string to render the dom node
      return document.createElement(domSpec[0]);
    }
    return this.node.isInline ? document.createElement('span') : document.createElement('div');
  }

  public getContentDOM(): { dom: Node; contentDOM?: Node | null | undefined } | undefined {
    return undefined;
  }

  private handleRef = (node: HTMLElement | undefined) => {
    const contentDOM = this.contentDOMWrapper || this.contentDOM;

    // move the contentDOM node inside the inner reference after rendering
    if (node && contentDOM && !node.contains(contentDOM)) {
      node.appendChild(contentDOM);
    }
  };

  public render(props: GProps, forwardRef?: (node: HTMLElement) => void): JSX.Element {
    const Component = this.Component;
    return (
      <Component
        view={this.view}
        getPosition={this.getPosition}
        node={this.node}
        forwardRef={forwardRef}
        {...props}
      />
    );
  }

  public update(
    node: ProsemirrorNode,
    _: Decoration[],
    validUpdate: (currentNode: ProsemirrorNode, newNode: ProsemirrorNode) => boolean = () => true,
  ) {
    // see https://github.com/ProseMirror/prosemirror/issues/648
    const isValidUpdate = this.node.type === node.type && validUpdate(this.node, node);

    if (!isValidUpdate) {
      return false;
    }

    if (this.domRef && !this.node.sameMarkup(node)) {
      this.setDomAttrs(node, this.domRef);
    }

    this.node = node;
    this.renderReactComponent(() => this.render(this.props, this.handleRef));

    return true;
  }

  /**
   * Copies the attributes from a ProseMirror Node to a DOM node.
   *
   * @param node The Prosemirror Node from which to source the attributes
   */
  public setDomAttrs(node: ProsemirrorNode, element: HTMLElement) {
    const { toDOM } = this.node.type.spec;
    if (toDOM) {
      const domSpec = toDOM(node);

      if (isString(domSpec) || isDOMNode(domSpec)) {
        return;
      }

      const attrs = domSpec[1];

      if (isPlainObject(attrs)) {
        Object.keys(attrs).forEach(attr => {
          element.setAttribute(attr, String(attrs[attr]));
        });

        return;
      }
    }

    Object.keys(node.attrs || {}).forEach(attr => {
      element.setAttribute(attr, node.attrs[attr]);
    });
  }

  /**
   * This is called whenever the node is being destroyed.
   */
  public destroy() {
    if (!this.domRef) {
      return;
    }

    this.portalContainer.remove(this.domRef);
    this.domRef = undefined;
    this.contentDOM = undefined;
  }
}
