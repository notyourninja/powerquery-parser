// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Ast, Type } from "../../../language";
import { NodeIdMapUtils, TXorNode, XorNodeUtils } from "../../../parser";
import { inspectTypeFromChildAttributeIndex, InspectTypeState } from "./common";

export function inspectTypeParameter(state: InspectTypeState, xorNode: TXorNode): Type.TType {
    XorNodeUtils.assertAstNodeKind(xorNode, Ast.NodeKind.Parameter);

    const maybeOptionalConstant:
        | Ast.TNode
        | undefined = NodeIdMapUtils.maybeChildAstByAttributeIndex(state.nodeIdMapCollection, xorNode.node.id, 0, [
        Ast.NodeKind.Constant,
    ]);

    const maybeParameterType: Type.TType | undefined = inspectTypeFromChildAttributeIndex(state, xorNode, 2);

    return {
        ...maybeParameterType,
        isNullable: maybeOptionalConstant !== undefined || maybeParameterType.isNullable,
    };
}
