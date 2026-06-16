package com.jungle.bulletin.dto;

// 로그인 성공 시 서버가 돌려주는 응답 그릇 (Spring → React)
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor // Lombok: 모든 필드를 받는 생성자 자동 생성 → new AuthResponse(token) 가능
public class AuthResponse {

    private String token; // 발급된 JWT 토큰
    private String nickname; // 로그인한 유저 닉네임 추가
}