package com.jungle.bulletin.controller;

import com.jungle.bulletin.dto.PostPageResponse;
import com.jungle.bulletin.dto.PostRequest;
import com.jungle.bulletin.dto.PostResponse;
import com.jungle.bulletin.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")  // 모든 엔드포인트의 공통 URL 접두사
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    // 전체 목록 조회 + 검색 + 카테고리 필터 + 페이징 (인증 불필요)
    @GetMapping
    public ResponseEntity<PostPageResponse> getAllPosts(
            @RequestParam(required = false) String keyword,           // 키워드 없으면 전체 조회
            @RequestParam(required = false) Long domainId,            // 도메인 필터 (선택)
            @RequestParam(required = false) Long projectTypeId,       // 성격 필터 (선택)
            @RequestParam(defaultValue = "0") int page,               // 페이지 번호 (기본값 0)
            @RequestParam(defaultValue = "10") int size) {            // 페이지 크기 (기본값 10)
        // Page<PostResponse> → PostPageResponse로 변환해서 필요한 필드만 반환
        return ResponseEntity.ok(new PostPageResponse(postService.getAllPosts(keyword, domainId, projectTypeId, page, size)));
    }

    // 단건 조회 — GET /api/posts/{id} (인증 불필요)
    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getPost(@PathVariable Long id) {
        return ResponseEntity.ok(postService.getPost(id));
    }

    // 게시글 작성 — POST /api/posts (인증 필요)
    // @AuthenticationPrincipal: JwtFilter가 SecurityContext에 저장한 유저 정보를 꺼냄
    @PostMapping
    public ResponseEntity<PostResponse> createPost(
            @RequestBody PostRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();  // UserDetails에서 이메일 추출
        return ResponseEntity.ok(postService.createPost(request, email));
    }

    // 게시글 수정 — PUT /api/posts/{id} (인증 필요)
    @PutMapping("/{id}")
    public ResponseEntity<PostResponse> updatePost(
            @PathVariable Long id,
            @RequestBody PostRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        return ResponseEntity.ok(postService.updatePost(id, request, email));
    }

    // 프로젝트 개선 제안 — POST /api/posts/{id}/improve (인증 필요)
    @PostMapping("/{id}/improve")
    public ResponseEntity<Object> improveProject(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authorizationHeader) {
        return ResponseEntity.ok(postService.improveProject(id, authorizationHeader));
    }

    // 게시글 삭제 — DELETE /api/posts/{id} (인증 필요)
    // 삭제 성공 시 204 No Content 반환 (돌려줄 데이터 없음)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        postService.deletePost(id, email);
        return ResponseEntity.noContent().build();
    }
}
