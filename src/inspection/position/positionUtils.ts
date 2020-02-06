// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { isNever } from "../../common";
import { Token, TokenPosition } from "../../lexer";
import { Ast, NodeIdMap, NodeIdMapUtils, ParserContext, TXorNode, XorNodeKind } from "../../parser";
import { Position } from "./position";

export function isBeforeXorNode(position: Position, xorNode: TXorNode, isBoundIncluded: boolean): boolean {
    switch (xorNode.kind) {
        case XorNodeKind.Ast:
            return isBeforeAstNode(position, xorNode.node, isBoundIncluded);

        case XorNodeKind.Context:
            return isBeforeContextNode(position, xorNode.node, isBoundIncluded);

        default:
            throw isNever(xorNode);
    }
}

export function isInXorNode(
    position: Position,
    nodeIdMapCollection: NodeIdMap.Collection,
    xorNode: TXorNode,
    isLowerBoundIncluded: boolean,
    isUpperBoundIncluded: boolean,
): boolean {
    switch (xorNode.kind) {
        case XorNodeKind.Ast:
            return isInAstNode(position, xorNode.node, isLowerBoundIncluded, isUpperBoundIncluded);

        case XorNodeKind.Context:
            return isInContextNode(
                position,
                nodeIdMapCollection,
                xorNode.node,
                isLowerBoundIncluded,
                isUpperBoundIncluded,
            );

        default:
            throw isNever(xorNode);
    }
}

export function isOnXorNodeStart(position: Position, xorNode: TXorNode): boolean {
    switch (xorNode.kind) {
        case XorNodeKind.Ast:
            return isOnAstNodeStart(position, xorNode.node);

        case XorNodeKind.Context:
            return isOnContextNodeStart(position, xorNode.node);

        default:
            throw isNever(xorNode);
    }
}

export function isOnXorNodeEnd(
    position: Position,
    xorNode: TXorNode,
    nodeIdMapCollection: NodeIdMap.Collection,
): boolean {
    switch (xorNode.kind) {
        case XorNodeKind.Ast:
            return isOnAstNodeEnd(position, xorNode.node);

        case XorNodeKind.Context:
            return isOnContextNodeEnd(position, xorNode.node, nodeIdMapCollection);

        default:
            throw isNever(xorNode);
    }
}

export function isAfterXorNode(
    position: Position,
    nodeIdMapCollection: NodeIdMap.Collection,
    xorNode: TXorNode,
    isBoundIncluded: boolean,
): boolean {
    switch (xorNode.kind) {
        case XorNodeKind.Ast:
            return isAfterAstNode(position, xorNode.node, isBoundIncluded);

        case XorNodeKind.Context:
            return isAfterContextNode(position, nodeIdMapCollection, xorNode.node, isBoundIncluded);

        default:
            throw isNever(xorNode);
    }
}

export function isBeforeContextNode(
    position: Position,
    contextNode: ParserContext.Node,
    isBoundIncluded: boolean,
): boolean {
    const maybeTokenStart: Token | undefined = contextNode.maybeTokenStart;
    if (maybeTokenStart === undefined) {
        return false;
    }
    const tokenStart: Token = maybeTokenStart;

    return isBeforeTokenPosition(position, tokenStart.positionStart, isBoundIncluded);
}

export function isInContextNode(
    position: Position,
    nodeIdMapCollection: NodeIdMap.Collection,
    contextNode: ParserContext.Node,
    isLowerBoundIncluded: boolean,
    isHigherBoundIncluded: boolean,
): boolean {
    return (
        !isBeforeContextNode(position, contextNode, isLowerBoundIncluded) &&
        !isAfterContextNode(position, nodeIdMapCollection, contextNode, isHigherBoundIncluded)
    );
}

export function isOnContextNodeStart(position: Position, contextNode: ParserContext.Node): boolean {
    return contextNode.maybeTokenStart !== undefined
        ? isOnTokenPosition(position, contextNode.maybeTokenStart.positionStart)
        : false;
}

export function isOnContextNodeEnd(
    position: Position,
    contextNode: ParserContext.Node,
    nodeIdMapCollection: NodeIdMap.Collection,
): boolean {
    const maybeLeaf: Ast.TNode | undefined = NodeIdMapUtils.maybeRightMostLeaf(nodeIdMapCollection, contextNode.id);
    if (maybeLeaf === undefined) {
        return false;
    }

    return isOnAstNodeEnd(position, maybeLeaf);
}

export function isAfterContextNode(
    position: Position,
    nodeIdMapCollection: NodeIdMap.Collection,
    contextNode: ParserContext.Node,
    isBoundIncluded: boolean,
): boolean {
    const maybeLeaf: Ast.TNode | undefined = NodeIdMapUtils.maybeRightMostLeaf(nodeIdMapCollection, contextNode.id);
    if (maybeLeaf === undefined) {
        // We're assuming position is a valid range for the document.
        // Therefore if the context node didn't have a token (caused by EOF) we can make this assumption.
        if (contextNode.maybeTokenStart === undefined) {
            return false;
        } else {
            return isAfterTokenPosition(position, contextNode.maybeTokenStart.positionEnd, isBoundIncluded);
        }
    }
    const leaf: Ast.TNode = maybeLeaf;

    return isAfterAstNode(position, leaf, isBoundIncluded);
}

export function isBeforeAstNode(position: Position, astNode: Ast.TNode, isBoundIncluded: boolean): boolean {
    return isBeforeTokenPosition(position, astNode.tokenRange.positionStart, isBoundIncluded);
}

export function isInAstNode(
    position: Position,
    astNode: Ast.TNode,
    isLowerBoundIncluded: boolean,
    isHigherBoundIncluded: boolean,
): boolean {
    return (
        !isBeforeAstNode(position, astNode, isLowerBoundIncluded) &&
        !isAfterAstNode(position, astNode, isHigherBoundIncluded)
    );
}

export function isOnAstNodeStart(position: Position, astNode: Ast.TNode): boolean {
    return isOnTokenPosition(position, astNode.tokenRange.positionStart);
}

export function isOnAstNodeEnd(position: Position, astNode: Ast.TNode): boolean {
    return isOnTokenPosition(position, astNode.tokenRange.positionEnd);
}

export function isAfterAstNode(position: Position, astNode: Ast.TNode, isBoundIncluded: boolean): boolean {
    return isAfterTokenPosition(position, astNode.tokenRange.positionEnd, isBoundIncluded);
}

export function isInToken(
    position: Position,
    token: Token,
    isLowerBoundIncluded: boolean,
    isHigherBoundIncluded: boolean,
): boolean {
    return (
        !isBeforeTokenPosition(position, token.positionStart, isLowerBoundIncluded) &&
        !isAfterTokenPosition(position, token.positionEnd, isHigherBoundIncluded)
    );
}

export function isBeforeTokenPosition(
    position: Position,
    tokenPosition: TokenPosition,
    isBoundIncluded: boolean,
): boolean {
    const positionLineNumber: number = position.lineNumber;

    if (positionLineNumber < tokenPosition.lineNumber) {
        return true;
    } else if (positionLineNumber > tokenPosition.lineNumber) {
        return false;
    } else {
        const upperBound: number = isBoundIncluded ? tokenPosition.lineCodeUnit : tokenPosition.lineCodeUnit + 1;
        return position.lineCodeUnit < upperBound;
    }
}

export function isOnTokenPosition(position: Position, tokenPosition: TokenPosition): boolean {
    return position.lineNumber === tokenPosition.lineNumber && position.lineCodeUnit === tokenPosition.lineCodeUnit;
}

export function isAfterTokenPosition(
    position: Position,
    tokenPosition: TokenPosition,
    isBoundIncluded: boolean,
): boolean {
    const positionLineNumber: number = position.lineNumber;

    if (positionLineNumber < tokenPosition.lineNumber) {
        return false;
    } else if (positionLineNumber > tokenPosition.lineNumber) {
        return true;
    } else {
        const upperBound: number = isBoundIncluded ? tokenPosition.lineCodeUnit : tokenPosition.lineCodeUnit - 1;
        return position.lineCodeUnit > upperBound;
    }
}