package com.jungle.bulletin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tags")
@Getter
@NoArgsConstructor
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)  // 태그명은 중복 불허
    private String name;

    // 태그 생성 시 이름을 받는 생성자
    public Tag(String name) {
        this.name = name;
    }
}