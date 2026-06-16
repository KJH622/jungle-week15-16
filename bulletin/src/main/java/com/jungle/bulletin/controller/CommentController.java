package com.jungle.bulletin.controller;

import com.jungle.bulletin.dto.CommentRequest;
import com.jungle.bulletin.dto.CommentResponse;
import com.jungle.bulletin.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts/{postId}/comments")  // 댓글은 항상 게시글 하위 URL
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // 특정 게시글의 댓글 목록 조회 — 비로그인도 가능 (SecurityConfig에서 추가 필요)
    @GetMapping
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable Long postId) {
        return ResponseEntity.ok(commentService.getComments(postId));
    }

    // 댓글 작성 — postId와 JWT email 둘 다 Service로 전달
    @PostMapping
    public ResponseEntity<CommentResponse> createComment(
            @PathVariable Long postId,
            @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        return ResponseEntity.ok(commentService.createComment(postId, request, email));
    }

    // 댓글 수정 — URL에 postId, commentId 둘 다 있지만 Service엔 commentId만 전달
    @PutMapping("/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        return ResponseEntity.ok(commentService.updateComment(commentId, request, email));
    }

    // 댓글 삭제 — 성공 시 204 No Content 반환
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        commentService.deleteComment(commentId, email);
        return ResponseEntity.noContent().build();
    }
}