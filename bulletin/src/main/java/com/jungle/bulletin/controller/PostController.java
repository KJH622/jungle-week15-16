package com.jungle.bulletin.controller;

import com.jungle.bulletin.dto.PostRequest;
import com.jungle.bulletin.dto.PostResponse;
import com.jungle.bulletin.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")  // 모든 엔드포인트의 공통 URL 접두사
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    // 전체 목록 조회 — GET /api/posts (인증 불필요)
    @GetMapping
    public ResponseEntity<List<PostResponse>> getAllPosts() {
        return ResponseEntity.ok(postService.getAllPosts());
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