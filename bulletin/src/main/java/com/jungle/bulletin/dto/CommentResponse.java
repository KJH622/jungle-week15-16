package com.jungle.bulletin.dto;

import com.jungle.bulletin.entity.Comment;
import lombok.Getter;

import java.time.LocalDateTime;

// 댓글 조회 시 클라이언트에게 돌려주는 데이터 그릇 (엔티티 직접 노출 방지)
@Getter
public class CommentResponse {
    private Long id;
    private String content;
    private String authorNickname;  // author 객체 대신 닉네임만 노출
    private Long postId;            // 어떤 게시글의 댓글인지
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Comment 엔티티를 받아서 필요한 필드만 꺼내는 생성자
    public CommentResponse(Comment comment) {
        this.id = comment.getId();
        this.content = comment.getContent();
        this.authorNickname = comment.getAuthor().getNickname();
        this.postId = comment.getPost().getId();
        this.createdAt = comment.getCreatedAt();
        this.updatedAt = comment.getUpdatedAt();
    }
}