"""
MCP 서버 연결 테스트
실행: python test_mcp.py
전제: mcp_server.py가 8002포트에서 실행 중이어야 함
"""

import asyncio
import json
from mcp import ClientSession
from mcp.client.sse import sse_client

MCP_URL = "http://localhost:8002/sse"
TEST_REPO = "https://github.com/facebook/react"


async def call_tool(session, name, args):
    print(f"\n{'='*50}")
    print(f"도구: {name}")
    print(f"인자: {args}")
    try:
        result = await session.call_tool(name, args)
        data = json.loads(result.content[0].text)
        print(f"결과: {json.dumps(data, ensure_ascii=False, indent=2)[:300]}")
        return True
    except Exception as e:
        print(f"실패: {type(e).__name__}: {e}")
        return False


async def main():
    print(f"MCP 서버 연결 시도: {MCP_URL}")

    try:
        async with sse_client(MCP_URL) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                print("✅ 연결 성공!\n")

                # 사용 가능한 도구 목록 출력
                tools = await session.list_tools()
                print("등록된 도구 목록:")
                for t in tools.tools:
                    print(f"  - {t.name}")

                # 4개 도구 순서대로 테스트
                results = []
                results.append(await call_tool(session, "get_github_repo", {"url": TEST_REPO}))
                results.append(await call_tool(session, "get_github_readme", {"url": TEST_REPO}))
                results.append(await call_tool(session, "get_github_issues", {"url": TEST_REPO}))
                results.append(await call_tool(session, "get_github_languages", {"url": TEST_REPO}))

                print(f"\n{'='*50}")
                passed = sum(results)
                print(f"결과: {passed}/4 통과")

    except Exception as e:
        print(f"❌ 연결 실패: {type(e).__name__}: {e}")
        print("mcp_server.py가 실행 중인지 확인하세요: python mcp_server.py")


asyncio.run(main())
