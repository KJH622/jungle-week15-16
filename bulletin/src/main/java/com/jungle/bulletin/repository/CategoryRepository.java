package com.jungle.bulletin.repository;

import com.jungle.bulletin.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// JpaRepository 상속으로 기본 CRUD 자동 제공
public interface CategoryRepository extends JpaRepository<Category, Long> {

    // 타입별 카테고리 목록 조회 — DOMAIN/PROJECT_TYPE으로 구분해서 반환
    List<Category> findByType(Category.CategoryType type);
}