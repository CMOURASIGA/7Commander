import { test, expect } from "@playwright/test";
import { classifyAuditSource } from "../../services/kairos-consistency-sources";

test("a failed source is not classified as empty", () => {
  expect(classifyAuditSource("Decisões", {data:null,count:null,error:{message:"403 Forbidden"}}).state).toBe("erro");
});
test("a complete empty source is explicitly empty", () => {
  expect(classifyAuditSource("Backlog", {data:[],count:0,error:null}).state).toBe("vazia");
});
test("a truncated source remains partial", () => {
  const result=classifyAuditSource("Kanban", {data:[{id:"one"}],count:9,error:null});
  expect(result.state).toBe("parcial");
  expect(result.total).toBe(9);
});
test("a source without exact count is not declared complete", () => {
  expect(classifyAuditSource("Sprints", {data:[],count:null,error:null}).state).toBe("parcial");
});
