package com.jungle.bulletin.repository;

import com.jungle.bulletin.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// JpaRepository<엔티티 타입, PK 타입>을 상속하면 기본 CRUD 자동 제공
public interface PostRepository extends JpaRepository<Post, Long> {

    // 메서드 이름 규칙: findBy + 필드명 + OrderBy + 필드명 + Desc
    // Spring이 이름을 읽고 SQL을 자동으로 만들어줌
    // → SELECT * FROM posts ORDER BY created_at DESC
    List<Post> findAllByOrderByCreatedAtDesc();

    // 검색 + 카테고리 필터 + 페이징
    @Query("SELECT DISTINCT p FROM Post p LEFT JOIN p.tags t " +
            "WHERE (:keyword IS NULL OR p.title LIKE %:keyword% OR p.content LIKE %:keyword% OR t.name LIKE %:keyword%) " +
            "AND (:domainId IS NULL OR p.domain.id = :domainId) " +
            "AND (:projectTypeId IS NULL OR p.projectType.id = :projectTypeId) " +
            "ORDER BY p.createdAt DESC")
    // DISTINCT: 태그 여러 개일 때 같은 게시글 중복 방지
    // LEFT JOIN p.tags t: 태그명도 검색 대상에 포함
    // :keyword IS NULL: 키워드 없으면 조건 무시 → 전체 조회
    // Page<Post>: 페이징 결과 + 전체 개수 메타 정보 포함
    Page<Post> search(@Param("keyword") String keyword,
                      @Param("domainId") Long domainId,
                      @Param("projectTypeId") Long projectTypeId,
                      Pageable pageable);
}