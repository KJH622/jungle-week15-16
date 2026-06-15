package com.jungle.bulletin.dto;

import com.jungle.bulletin.entity.Post;
import lombok.Getter;

import java.time.LocalDateTime;

// 서버가 클라이언트에게 돌려주는 게시글 데이터
@Getter
public class PostResponse {
    private Long id;
    private String title;
    private String content;
    private String authorNickname;  // User 객체 전체 대신 닉네임만 노출
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Post 엔티티를 받아서 필요한 필드만 골라 담는 생성자
    public PostResponse(Post post) {
        this.id = post.getId();
        this.title = post.getTitle();
        this.content = post.getContent();
        this.authorNickname = post.getAuthor().getNickname(); // 연관된 User에서 닉네임만 꺼냄
        this.createdAt = post.getCreatedAt();
        this.updatedAt = post.getUpdatedAt();
    }
}