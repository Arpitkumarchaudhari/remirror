import { InputRule as PMInputRule } from 'prosemirror-inputrules';
import { Mark as PMMark, ResolvedPos as PMResolvedPos } from 'prosemirror-model';
import {
  PluginKey as PMPluginKey,
  Selection as PMSelection,
  Transaction as PMTransaction,
} from 'prosemirror-state';
import { Mapping as PMMapping } from 'prosemirror-transform';
import { EditorView as PMEditorView } from 'prosemirror-view';
import { EditorSchema } from './base';

/* Type Aliases */

export type EditorView = PMEditorView<EditorSchema>;
export type Selection = PMSelection<EditorSchema>;
export type Transaction = PMTransaction<EditorSchema>;
export type PluginKey<GPluginState = any> = PMPluginKey<GPluginState, EditorSchema>;
export type Mark = PMMark<EditorSchema>;
export type ResolvedPos = PMResolvedPos<EditorSchema>;
export type InputRule = PMInputRule<EditorSchema>;
export type Mapping = PMMapping;