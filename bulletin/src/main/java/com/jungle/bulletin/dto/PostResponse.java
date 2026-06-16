package com.jungle.bulletin.dto;

import com.jungle.bulletin.entity.Post;
import lombok.Getter;

import java.time.LocalDateTime;
import com.jungle.bulletin.entity.Tag;
import java.util.List;
import java.util.stream.Collectors;

// 서버가 클라이언트에게 돌려주는 게시글 데이터
@Getter
public class PostResponse {
    private Long id;
    private String title;
    private String content;
    private String authorNickname;  // User 객체 전체 대신 닉네임만 노출
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<String> tags;        // 태그 이름 목록
    private String domainName;        // 도메인 카테고리 이름
    private String projectTypeName;   // 성격 카테고리 이름
    private String githubUrl;         // GitHub 저장소 URL

    // Post 엔티티를 받아서 필요한 필드만 골라 담는 생성자
    public PostResponse(Post post) {
        this.id = post.getId();
        this.title = post.getTitle();
        this.content = post.getContent();
        this.authorNickname = post.getAuthor().getNickname(); // 연관된 User에서 닉네임만 꺼냄
        this.createdAt = post.getCreatedAt();
        this.updatedAt = post.getUpdatedAt();
        this.tags = post.getTags().stream()
                .map(Tag::getName).collect(Collectors.toList());  // 태그 엔티티 → 이름만 추출
        this.domainName = post.getDomain() != null ? post.getDomain().getName() : null;
        this.projectTypeName = post.getProjectType() != null ? post.getProjectType().getName() : null;
        this.githubUrl = post.getGithubUrl(); // GitHub URL
    }
}