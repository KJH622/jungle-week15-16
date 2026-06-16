package com.jungle.bulletin.entity;

// 게시글 DB 테이블과 매핑되는 엔티티
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT") // 긴 텍스트 저장 가능하도록
    private String content;

    // 게시글(N) → 유저(1) 연관관계
    @ManyToOne(fetch = FetchType.LAZY)  // 지연 로딩 — 필요할 때만 User 조회 (성능)
    @JoinColumn(name = "user_id")       // DB에 user_id 컬럼으로 저장
    private User author;

    // 게시글(N) ↔ 태그(M) : 중간 테이블 post_tags 자동 생성
    @ManyToMany
    @JoinTable(
        name = "post_tags",
        joinColumns = @JoinColumn(name = "post_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private List<Tag> tags = new ArrayList<>();

    // 게시글(N) → 도메인 카테고리(1) : 웹개발, 앱개발 등
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domain_id")
    private Category domain;

    // 게시글(N) → 성격 카테고리(1) : 토이프로젝트, 해커톤 등
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_type_id")
    private Category projectType;

    @Column
    private String githubUrl; // GitHub 저장소 URL (선택)

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate // 수정될 때마다 자동으로 현재 시간 업데이트
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}