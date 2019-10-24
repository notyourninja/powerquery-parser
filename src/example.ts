// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/* tslint:disable:no-console */

import { Inspection } from ".";
import { Option, ResultKind } from "./common";
import { LexAndParseOk, TriedLexAndParse, tryLexAndParse } from "./jobs";
import { Lexer, LexerError, LexerSnapshot, TriedLexerSnapshot } from "./lexer";
import { NodeIdMap, Parser, ParserContext, ParserError } from "./parser";

parseText(`1 is number is number`);

// @ts-ignore
function parseText(text: string): void {
    // Try lexing and parsing the argument which returns a Result object.
    // A Result is a union of (Ok<T> | Err<E>).
    const triedLexAndParse: TriedLexAndParse = tryLexAndParse(text, Parser.CombinatorialParser);

    // If the Result is an Ok, then log the jsonified abstract syntax tree (AST) which was parsed.
    if (triedLexAndParse.kind === ResultKind.Ok) {
        console.log(JSON.stringify(triedLexAndParse.value, undefined, 4));
    }
    // Else the Result is an Err, then log the jsonified error.
    else {
        console.log(triedLexAndParse.error.message);
        console.log(JSON.stringify(triedLexAndParse.error, undefined, 4));

        // If the error occured during parsing, then log the jsonified parsing context,
        // which is what was parsed up until the error was thrown.
        if (triedLexAndParse.error instanceof ParserError.ParserError) {
            console.log(JSON.stringify(triedLexAndParse.error.context, undefined, 4));
        }
    }
}

// @ts-ignore
function lexText(text: string): void {
    // State is let instead of const as calling Lexer functions return a new state object.

    // An error state is returned if the argument can't be lexed.
    // Use either the typeguard Lexer.isErrorState to discover if it's an error state,
    // or Lexer.maybeErrorLineMap to quickly get all lines with errors.
    // Note: At this point all errors are isolated to a single line.
    //       Checks for multiline errors, such as an unterminated string, have not been processed.
    let state: Lexer.State = Lexer.stateFrom(text);

    const maybeErrorLineMap: Option<Lexer.ErrorLineMap> = Lexer.maybeErrorLineMap(state);
    if (maybeErrorLineMap) {
        const errorLineMap: Lexer.ErrorLineMap = maybeErrorLineMap;

        for (const [lineNumber, errorLine] of errorLineMap.entries()) {
            console.log(`lineNumber ${lineNumber} has the following error: ${errorLine.error.message}`);
        }
        return;
    }

    // Appending a line is easy.
    state = Lexer.appendLine(state, "// hello world", "\n");

    // Updating a line number is also easy.
    // Be aware that this is a Result due the potential of invalid line numbers.
    // For fine-grained control there is also the method Lexer.tryUpdateRange which Lexer.tryUpdateLine calls directly.
    const triedUpdate: Lexer.TriedLexerUpdate = Lexer.tryUpdateLine(state, state.lines.length - 1, "// goodbye world");
    if (triedUpdate.kind === ResultKind.Err) {
        console.log("Failed to update line");
        return;
    }
    state = triedUpdate.value;

    // Once no more text is to be added / edited a LexerSnapshot should be created, which is an immutable copy that:
    //  * combines multiline tokens together
    //    (eg. StringLiteralStart + StringLiteralContent + StringLiteralEnd)
    //  * checks for multiline errors
    //    (eg. unterminated string error)

    // Creating a LexerSnapshot is a Result due to potential multiline token errors.
    const triedLexerSnapshot: TriedLexerSnapshot = LexerSnapshot.tryFrom(state);
    if (triedLexerSnapshot.kind === ResultKind.Ok) {
        const snapshot: LexerSnapshot = triedLexerSnapshot.value;
        console.log(`numTokens: ${snapshot.tokens}`);
        console.log(`numComments: ${snapshot.comments}`);
    }
    // A multiline token error was thrown.
    else {
        const error: LexerError.LexerError = triedLexerSnapshot.error;
        console.log(error.innerError.message);
        console.log(JSON.stringify(error.innerError, undefined, 4));
    }
}

// @ts-ignore
function inspectText(text: string, position: Inspection.Position): void {
    let nodeIdMapCollection: NodeIdMap.Collection;
    let leafNodeIds: ReadonlyArray<number>;

    // An inspection can be done if the text is successfully parsed,
    // or a ParserError instance was thrown during the parsing.
    const triedLexAndParse: TriedLexAndParse = tryLexAndParse(text, Parser.CombinatorialParser);
    if (triedLexAndParse.kind === ResultKind.Err) {
        if (!(triedLexAndParse.error instanceof ParserError.ParserError)) {
            console.log(`Lex and parse failed due to: ${triedLexAndParse.error.message}`);
            return;
        }

        const contextState: ParserContext.State = triedLexAndParse.error.context;
        nodeIdMapCollection = contextState.nodeIdMapCollection;
        leafNodeIds = contextState.leafNodeIds;
    } else {
        const lexAndParseOk: LexAndParseOk = triedLexAndParse.value;
        nodeIdMapCollection = lexAndParseOk.nodeIdMapCollection;
        leafNodeIds = lexAndParseOk.leafNodeIds;
    }

    // An inspection can fail if given invalid arguments.
    const triedInspection: Inspection.TriedInspection = Inspection.tryFrom(position, nodeIdMapCollection, leafNodeIds);
    if (triedInspection.kind === ResultKind.Err) {
        console.log(`Inspection failed due to: ${triedInspection.error.message}`);
        return;
    }
    const inspected: Inspection.Inspected = triedInspection.value;

    console.log(`Inspection scope: ${[...inspected.scope.entries()]}`);
    console.log(`Inspection nodes: ${JSON.stringify(inspected.nodes, undefined, 4)}`);
}
