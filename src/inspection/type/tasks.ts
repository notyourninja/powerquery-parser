// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Assert, CommonError, Result, ResultUtils } from "../../common";
import { Type } from "../../language";
import { getLocalizationTemplates } from "../../localization";
import { NodeIdMap, NodeIdMapUtils } from "../../parser";
import { CommonSettings } from "../../settings";
import { ScopeItemByKey } from "../scope";
import { ScopeTypeByKey } from "../scope";
import { TypeCache } from "./common";
import { assertGetOrCreateScope, getOrFindScopeItemType, InspectTypeState, inspectXor } from "./inspectType";

export type TriedScopeType = Result<ScopeTypeByKey, CommonError.CommonError>;

export type TriedType = Result<Type.TType, CommonError.CommonError>;

export function tryScopeType(
    settings: CommonSettings,
    nodeIdMapCollection: NodeIdMap.Collection,
    leafNodeIds: ReadonlyArray<number>,
    nodeId: number,
    maybeTypeCache: TypeCache | undefined = undefined,
): TriedScopeType {
    const state: InspectTypeState = {
        settings,
        givenTypeById: maybeTypeCache?.typeById ?? new Map(),
        deltaTypeById: new Map(),
        nodeIdMapCollection,
        leafNodeIds,
        scopeById: maybeTypeCache?.scopeById ?? new Map(),
    };

    return ResultUtils.ensureResult(getLocalizationTemplates(settings.locale), () => inspectScopeType(state, nodeId));
}

export function tryType(
    settings: CommonSettings,
    nodeIdMapCollection: NodeIdMap.Collection,
    leafNodeIds: ReadonlyArray<number>,
    nodeId: number,
    maybeTypeCache: TypeCache | undefined = undefined,
): TriedType {
    const state: InspectTypeState = {
        settings,
        givenTypeById: maybeTypeCache?.scopeById ?? new Map(),
        deltaTypeById: new Map(),
        nodeIdMapCollection,
        leafNodeIds,
        scopeById: maybeTypeCache?.typeById ?? new Map(),
    };

    return ResultUtils.ensureResult(getLocalizationTemplates(settings.locale), () =>
        inspectXor(state, NodeIdMapUtils.assertXor(nodeIdMapCollection, nodeId)),
    );
}

function inspectScopeType(state: InspectTypeState, nodeId: number): ScopeTypeByKey {
    const scopeItemByKey: ScopeItemByKey = assertGetOrCreateScope(state, nodeId);

    for (const scopeItem of scopeItemByKey.values()) {
        if (!state.givenTypeById.has(scopeItem.id)) {
            state.deltaTypeById.set(scopeItem.id, getOrFindScopeItemType(state, scopeItem));
        }
    }

    for (const [key, value] of state.deltaTypeById.entries()) {
        state.givenTypeById.set(key, value);
    }

    const result: ScopeTypeByKey = new Map();
    for (const [key, scopeItem] of scopeItemByKey.entries()) {
        const maybeType: Type.TType | undefined = state.givenTypeById.get(scopeItem.id);
        Assert.isDefined(maybeType, `expected nodeId to be in givenTypeById`, { nodeId: scopeItem.id });

        result.set(key, maybeType);
    }

    return result;
}
