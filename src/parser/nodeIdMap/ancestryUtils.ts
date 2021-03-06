// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { NodeIdMap, NodeIdMapIterator, XorNodeUtils } from ".";
import { Assert } from "../../common";
import { Ast } from "../../language";
import { TXorNode } from "./xorNode";

export function assertAncestry(nodeIdMapCollection: NodeIdMap.Collection, rootId: number): ReadonlyArray<TXorNode> {
    const ancestryIds: number[] = [rootId];

    let maybeParentId: number | undefined = nodeIdMapCollection.parentIdById.get(rootId);
    while (maybeParentId) {
        const parentId: number = maybeParentId;
        ancestryIds.push(parentId);
        maybeParentId = nodeIdMapCollection.parentIdById.get(parentId);
    }

    return NodeIdMapIterator.assertIterXor(nodeIdMapCollection, ancestryIds);
}

export function assertLeaf(ancestry: ReadonlyArray<TXorNode>): TXorNode {
    const maybeLeaf: TXorNode | undefined = ancestry[0];
    Assert.isDefined(maybeLeaf);
    return maybeLeaf;
}

export function assertRoot(ancestry: ReadonlyArray<TXorNode>): TXorNode {
    Assert.isTrue(ancestry.length > 0, "ancestry.length > 0");
    return ancestry[ancestry.length - 1];
}

export function assertNextXor(
    ancestry: ReadonlyArray<TXorNode>,
    ancestryIndex: number,
    maybeAllowedNodeKinds: ReadonlyArray<Ast.NodeKind> | undefined = undefined,
): TXorNode {
    return assertNthNextXor(ancestry, ancestryIndex, 1, maybeAllowedNodeKinds);
}

export function assertNthNextXor(
    ancestry: ReadonlyArray<TXorNode>,
    ancestryIndex: number,
    n: number = 1,
    maybeAllowedNodeKinds: ReadonlyArray<Ast.NodeKind> | undefined = undefined,
): TXorNode {
    const maybeXorNode: TXorNode | undefined = maybeNthNextXor(ancestry, ancestryIndex, n, maybeAllowedNodeKinds);
    Assert.isDefined(maybeXorNode, `no next node`, { ancestryIndex, n });

    return maybeXorNode;
}

export function assertNthPreviousXor(
    ancestry: ReadonlyArray<TXorNode>,
    ancestryIndex: number,
    n: number = 1,
    maybeAllowedNodeKinds: ReadonlyArray<Ast.NodeKind> | undefined = undefined,
): TXorNode {
    const maybeXorNode: TXorNode | undefined = maybeNthPreviousXor(ancestry, ancestryIndex, n);
    Assert.isDefined(maybeXorNode, `no previous node`, { ancestryIndex, n });

    if (maybeAllowedNodeKinds !== undefined) {
        XorNodeUtils.assertAnyAstNodeKind(maybeXorNode, maybeAllowedNodeKinds);
    }

    return maybeXorNode;
}

export function assertPreviousXor(
    ancestry: ReadonlyArray<TXorNode>,
    ancestryIndex: number,
    maybeAllowedNodeKinds: ReadonlyArray<Ast.NodeKind> | undefined = undefined,
): TXorNode {
    return assertNthPreviousXor(ancestry, ancestryIndex, 1, maybeAllowedNodeKinds);
}

export function maybeNthPreviousXor(
    ancestry: ReadonlyArray<TXorNode>,
    ancestryIndex: number,
    n: number = 1,
    maybeAllowedNodeKinds: ReadonlyArray<Ast.NodeKind> | undefined = undefined,
): TXorNode | undefined {
    const maybeXorNode: TXorNode | undefined = ancestry[ancestryIndex - n];
    if (maybeXorNode !== undefined && maybeAllowedNodeKinds !== undefined) {
        return maybeAllowedNodeKinds.indexOf(maybeXorNode.node.kind) === -1 ? undefined : maybeXorNode;
    }

    return maybeXorNode;
}

export function maybeNextXor(
    ancestry: ReadonlyArray<TXorNode>,
    ancestryIndex: number,
    maybeAllowedNodeKinds: ReadonlyArray<Ast.NodeKind> | undefined = undefined,
): TXorNode | undefined {
    return maybeNthNextXor(ancestry, ancestryIndex, 1, maybeAllowedNodeKinds);
}

export function maybeNthNextXor(
    ancestry: ReadonlyArray<TXorNode>,
    ancestryIndex: number,
    n: number = 1,
    maybeAllowedNodeKinds: ReadonlyArray<Ast.NodeKind> | undefined = undefined,
): TXorNode | undefined {
    const maybeXorNode: TXorNode | undefined = ancestry[ancestryIndex + n];
    if (maybeXorNode !== undefined && maybeAllowedNodeKinds !== undefined) {
        return maybeAllowedNodeKinds.indexOf(maybeXorNode.node.kind) === -1 ? undefined : maybeXorNode;
    }

    return maybeXorNode;
}

export function maybePreviousXor(
    ancestry: ReadonlyArray<TXorNode>,
    ancestryIndex: number,
    maybeAllowedNodeKinds: ReadonlyArray<Ast.NodeKind> | undefined = undefined,
): TXorNode | undefined {
    return maybeNthPreviousXor(ancestry, ancestryIndex, 1, maybeAllowedNodeKinds);
}
