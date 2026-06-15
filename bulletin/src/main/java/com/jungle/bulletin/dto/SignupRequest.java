package com.jungle.bulletin.dto;

// 회원가입 요청 데이터를 받는 그릇 (React → Spring)
import lombok.Getter;

@Getter // Lombok: 모든 필드의 getter 자동 생성 (AuthService에서 값을 꺼낼 때 사용)
public class SignupRequest {

    private String email;
    private String password;
    private String nickname;
}