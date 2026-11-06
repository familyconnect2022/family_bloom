# Family Bloom — Phase 6.3 Final Connector Polish

Checkpoint cuối trước khi đóng Phase 6.3.

- Child gần phía dưới parent: ưu tiên một connector dọc duy nhất.
- Side connector: rời thân node theo phương ngang trước, sau đó mới drop dọc xuống child.
- Không còn đoạn line chạy dọc cạnh parent rồi mới rẽ ngang.
- Direct vertical có precedence so với side anchor khi child vẫn nằm dưới footprint hợp lý của parent.
- Không đổi schema, Rules, Functions hoặc DG-11.

Kết quả kiểm tra source merged:

- Dense layout / connector routing: PASS
- DG-11: PASS
- Query/Kinship/Focus: PASS
- Benchmark 50/100/300/500: PASS
- Static transpile: PASS (121 TS/TSX)

Phase 6.3: CLOSED.
