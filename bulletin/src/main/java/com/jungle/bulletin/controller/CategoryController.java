package com.jungle.bulletin.controller;

import com.jungle.bulletin.entity.Category;
import com.jungle.bulletin.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")  // 카테고리 목록 제공 API
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;

    // 타입별 카테고리 목록 조회 — ?type=DOMAIN 또는 ?type=PROJECT_TYPE으로 구분
    @GetMapping
    public ResponseEntity<List<Category>> getCategories(
            @RequestParam Category.CategoryType type) {  // 쿼리 파라미터로 타입 받음
        return ResponseEntity.ok(categoryRepository.findByType(type));
    }
}