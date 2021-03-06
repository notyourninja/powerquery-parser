// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { NodeIdMap, NodeIdMapUtils, TXorNode, XorNodeKind, XorNodeUtils } from ".";
import { Assert, MapUtils } from "../../common";
import { Ast } from "../../language";

export interface KeyValuePair<T extends Ast.GeneralizedIdentifier | Ast.Identifier> {
    readonly source: TXorNode;
    readonly key: T;
    readonly keyLiteral: string;
    readonly maybeValue: TXorNode | undefined;
}

// -------------------------------
// -------- Simple iters  --------
// -------------------------------

// Assert the existence of children for the node.
// Returns an array of nodeIds of children for the given node.
export function assertIterChildIds(childIdsById: NodeIdMap.ChildIdsById, nodeId: number): ReadonlyArray<number> {
    return MapUtils.assertGet(childIdsById, nodeId);
}

// Assert the existence of children for the node and that they are Ast nodes.
// Returns an array of children (which are TNodes) for the given node.
export function assertIterChildrenAst(
    nodeIdMapCollection: NodeIdMap.Collection,
    parentId: number,
): ReadonlyArray<Ast.TNode> {
    const astNodeById: NodeIdMap.AstNodeById = nodeIdMapCollection.astNodeById;
    return assertIterChildIds(nodeIdMapCollection.childIdsById, parentId).map(childId =>
        NodeIdMapUtils.assertAst(astNodeById, childId),
    );
}

// Assert the existence of children for the node.
// Returns an array of children (as XorNodes) for the given node.
export function assertIterChildrenXor(
    nodeIdMapCollection: NodeIdMap.Collection,
    parentId: number,
): ReadonlyArray<TXorNode> {
    const maybeChildIds: ReadonlyArray<number> | undefined = nodeIdMapCollection.childIdsById.get(parentId);
    if (maybeChildIds === undefined) {
        return [];
    }
    const childIds: ReadonlyArray<number> = maybeChildIds;

    return assertIterXor(nodeIdMapCollection, childIds);
}

// Given a list of nodeIds, assert the existence of then return them as XorNodes.
export function assertIterXor(
    nodeIdMapCollection: NodeIdMap.Collection,
    nodeIds: ReadonlyArray<number>,
): ReadonlyArray<TXorNode> {
    return nodeIds.map(nodeId => NodeIdMapUtils.assertXor(nodeIdMapCollection, nodeId));
}

// If any exist, returns all Ast nodes under the given node.
export function maybeIterChildrenAst(
    nodeIdMapCollection: NodeIdMap.Collection,
    parentId: number,
): ReadonlyArray<Ast.TNode> | undefined {
    const maybeChildIds: ReadonlyArray<number> | undefined = nodeIdMapCollection.childIdsById.get(parentId);
    if (maybeChildIds === undefined) {
        return undefined;
    }
    const childIds: ReadonlyArray<number> = maybeChildIds;

    const astNodeById: NodeIdMap.AstNodeById = nodeIdMapCollection.astNodeById;
    return childIds.map(childId => NodeIdMapUtils.assertAst(astNodeById, childId));
}

export function maybeNextSiblingXor(nodeIdMapCollection: NodeIdMap.Collection, nodeId: number): TXorNode | undefined {
    return maybeNthSiblingXor(nodeIdMapCollection, nodeId, 1);
}

// Grabs the parent for the given nodeId, then returns the nth child of the parent where that child's attributeIndex is
// (givenNode.maybeAttributeIndex + offset) as an XorNode if such a child exists.
export function maybeNthSiblingXor(
    nodeIdMapCollection: NodeIdMap.Collection,
    rootId: number,
    offset: number,
): TXorNode | undefined {
    const childXorNode: TXorNode = NodeIdMapUtils.assertXor(nodeIdMapCollection, rootId);
    if (childXorNode.node.maybeAttributeIndex === undefined) {
        return undefined;
    }

    const attributeIndex: number = childXorNode.node.maybeAttributeIndex + offset;
    if (attributeIndex < 0) {
        return undefined;
    }

    const parentXorNode: TXorNode = NodeIdMapUtils.assertParentXor(nodeIdMapCollection, rootId, undefined);
    const childIds: ReadonlyArray<number> = assertIterChildIds(nodeIdMapCollection.childIdsById, parentXorNode.node.id);
    if (childIds.length >= attributeIndex) {
        return undefined;
    }

    return NodeIdMapUtils.maybeXor(nodeIdMapCollection, childIds[attributeIndex]);
}

// ------------------------------------------
// -------- NodeKind Specific Iters  --------
// ------------------------------------------

// Iterates over Ast.TCsv.node
export function iterArrayWrapper(
    nodeIdMapCollection: NodeIdMap.Collection,
    arrayWrapper: TXorNode,
): ReadonlyArray<TXorNode> {
    XorNodeUtils.assertAstNodeKind(arrayWrapper, Ast.NodeKind.ArrayWrapper);

    if (arrayWrapper.kind === XorNodeKind.Ast) {
        return (arrayWrapper.node as Ast.TCsvArray).elements.map((wrapper: Ast.TCsv) =>
            XorNodeUtils.astFactory(wrapper.node),
        );
    }

    const partial: TXorNode[] = [];
    for (const csvXorNode of assertIterChildrenXor(nodeIdMapCollection, arrayWrapper.node.id)) {
        switch (csvXorNode.kind) {
            case XorNodeKind.Ast:
                partial.push(XorNodeUtils.astFactory((csvXorNode.node as Ast.TCsv).node));
                break;

            case XorNodeKind.Context: {
                const maybeChild: TXorNode | undefined = NodeIdMapUtils.maybeCsv(nodeIdMapCollection, csvXorNode);
                if (maybeChild !== undefined) {
                    partial.push(maybeChild);
                }
                break;
            }

            default:
                throw Assert.isNever(csvXorNode);
        }
    }

    return partial;
}

// Return all FieldSelector children under the given FieldProjection.
export function iterFieldProjection(
    nodeIdMapCollection: NodeIdMap.Collection,
    fieldProjection: TXorNode,
): ReadonlyArray<TXorNode> {
    XorNodeUtils.assertAstNodeKind(fieldProjection, Ast.NodeKind.FieldProjection);

    const maybeArrayWrapper: TXorNode | undefined = NodeIdMapUtils.maybeArrayWrapperContent(
        nodeIdMapCollection,
        fieldProjection,
    );
    return maybeArrayWrapper === undefined ? [] : iterArrayWrapper(nodeIdMapCollection, maybeArrayWrapper);
}

// Return all FieldSelector names under the given FieldProjection.
export function iterFieldProjectionNames(
    nodeIdMapCollection: NodeIdMap.Collection,
    fieldProjection: TXorNode,
): ReadonlyArray<string> {
    const result: string[] = [];

    for (const selector of iterFieldProjection(nodeIdMapCollection, fieldProjection)) {
        const maybeIdentifier: TXorNode | undefined = NodeIdMapUtils.maybeWrappedContent(
            nodeIdMapCollection,
            selector,
            Ast.NodeKind.GeneralizedIdentifier,
        );
        if (maybeIdentifier?.kind !== XorNodeKind.Ast) {
            break;
        } else {
            result.push((maybeIdentifier.node as Ast.GeneralizedIdentifier).literal);
        }
    }

    return result;
}

// Return all FieldSpecification children under the given FieldSpecificationList.
export function iterFieldSpecification(
    nodeIdMapCollection: NodeIdMap.Collection,
    fieldSpecificationList: TXorNode,
): ReadonlyArray<TXorNode> {
    XorNodeUtils.assertAstNodeKind(fieldSpecificationList, Ast.NodeKind.FieldSpecificationList);

    const maybeArrayWrapper: TXorNode | undefined = NodeIdMapUtils.maybeWrappedContent(
        nodeIdMapCollection,
        fieldSpecificationList,
        Ast.NodeKind.ArrayWrapper,
    );
    if (maybeArrayWrapper === undefined) {
        return [];
    }

    return iterArrayWrapper(nodeIdMapCollection, maybeArrayWrapper);
}

// Return all key-value-pair children under the given LetExpression.
export function iterLetExpression(
    nodeIdMapCollection: NodeIdMap.Collection,
    letExpression: TXorNode,
): ReadonlyArray<KeyValuePair<Ast.Identifier>> {
    XorNodeUtils.assertAstNodeKind(letExpression, Ast.NodeKind.LetExpression);

    const maybeArrayWrapper: TXorNode | undefined = NodeIdMapUtils.maybeChildXorByAttributeIndex(
        nodeIdMapCollection,
        letExpression.node.id,
        1,
        [Ast.NodeKind.ArrayWrapper],
    );
    return maybeArrayWrapper === undefined ? [] : iterKeyValuePairs(nodeIdMapCollection, maybeArrayWrapper);
}

// Return all ListItem children under the given ListExpression/ListLiteral.
export function iterListItems(nodeIdMapCollection: NodeIdMap.Collection, list: TXorNode): ReadonlyArray<TXorNode> {
    XorNodeUtils.assertAnyAstNodeKind(list, [Ast.NodeKind.ListExpression, Ast.NodeKind.ListLiteral]);

    const maybeArrayWrapper: TXorNode | undefined = NodeIdMapUtils.maybeArrayWrapperContent(nodeIdMapCollection, list);
    return maybeArrayWrapper === undefined ? [] : iterArrayWrapper(nodeIdMapCollection, maybeArrayWrapper);
}

// Return all key-value-pair children under the given RecordExpression/RecordLiteral.
export function iterRecord(
    nodeIdMapCollection: NodeIdMap.Collection,
    record: TXorNode,
): ReadonlyArray<KeyValuePair<Ast.GeneralizedIdentifier>> {
    XorNodeUtils.assertAnyAstNodeKind(record, [Ast.NodeKind.RecordExpression, Ast.NodeKind.RecordLiteral]);

    const maybeArrayWrapper: TXorNode | undefined = NodeIdMapUtils.maybeArrayWrapperContent(
        nodeIdMapCollection,
        record,
    );
    return maybeArrayWrapper === undefined ? [] : iterKeyValuePairs(nodeIdMapCollection, maybeArrayWrapper);
}

// Return all key-value-pair children under the given Section.
export function iterSection(
    nodeIdMapCollection: NodeIdMap.Collection,
    section: TXorNode,
): ReadonlyArray<KeyValuePair<Ast.Identifier>> {
    XorNodeUtils.assertAstNodeKind(section, Ast.NodeKind.Section);

    if (section.kind === XorNodeKind.Ast) {
        return (section.node as Ast.Section).sectionMembers.elements.map((sectionMember: Ast.SectionMember) => {
            const namePairedExpression: Ast.IdentifierPairedExpression = sectionMember.namePairedExpression;
            return {
                source: XorNodeUtils.astFactory(namePairedExpression),
                key: namePairedExpression.key,
                keyLiteral: namePairedExpression.key.literal,
                maybeValue: XorNodeUtils.astFactory(namePairedExpression.value),
            };
        });
    }

    const maybeSectionMemberArrayWrapper:
        | undefined
        | TXorNode = NodeIdMapUtils.maybeChildXorByAttributeIndex(nodeIdMapCollection, section.node.id, 4, [
        Ast.NodeKind.ArrayWrapper,
    ]);
    if (maybeSectionMemberArrayWrapper === undefined) {
        return [];
    }
    const sectionMemberArrayWrapper: TXorNode = maybeSectionMemberArrayWrapper;

    const partial: KeyValuePair<Ast.Identifier>[] = [];
    for (const sectionMember of assertIterChildrenXor(nodeIdMapCollection, sectionMemberArrayWrapper.node.id)) {
        const maybeKeyValuePair:
            | undefined
            | TXorNode = NodeIdMapUtils.maybeChildXorByAttributeIndex(nodeIdMapCollection, sectionMember.node.id, 2, [
            Ast.NodeKind.IdentifierPairedExpression,
        ]);
        if (maybeKeyValuePair === undefined) {
            continue;
        }
        const keyValuePair: TXorNode = maybeKeyValuePair;
        const keyValuePairNodeId: number = keyValuePair.node.id;

        const maybeKey: Ast.Identifier | undefined = NodeIdMapUtils.maybeChildAstByAttributeIndex(
            nodeIdMapCollection,
            keyValuePairNodeId,
            0,
            [Ast.NodeKind.Identifier],
        ) as Ast.Identifier;
        if (maybeKey === undefined) {
            continue;
        }
        const key: Ast.Identifier = maybeKey;

        partial.push({
            source: keyValuePair,
            key,
            keyLiteral: key.literal,
            maybeValue: NodeIdMapUtils.maybeChildXorByAttributeIndex(
                nodeIdMapCollection,
                keyValuePairNodeId,
                2,
                undefined,
            ),
        });
    }

    return partial;
}

function iterKeyValuePairs<T extends Ast.GeneralizedIdentifier | Ast.Identifier>(
    nodeIdMapCollection: NodeIdMap.Collection,
    arrayWrapper: TXorNode,
): ReadonlyArray<KeyValuePair<T>> {
    const partial: KeyValuePair<T>[] = [];
    for (const keyValuePair of iterArrayWrapper(nodeIdMapCollection, arrayWrapper)) {
        const maybeKey: Ast.TNode | undefined = NodeIdMapUtils.maybeChildAstByAttributeIndex(
            nodeIdMapCollection,
            keyValuePair.node.id,
            0,
            [Ast.NodeKind.GeneralizedIdentifier, Ast.NodeKind.Identifier],
        );
        if (maybeKey === undefined) {
            break;
        }
        const key: T = maybeKey as T & (Ast.GeneralizedIdentifier | Ast.Identifier);

        partial.push({
            source: keyValuePair,
            key,
            keyLiteral: key.literal,
            maybeValue: NodeIdMapUtils.maybeChildXorByAttributeIndex(
                nodeIdMapCollection,
                keyValuePair.node.id,
                2,
                undefined,
            ),
        });
    }

    return partial;
}
