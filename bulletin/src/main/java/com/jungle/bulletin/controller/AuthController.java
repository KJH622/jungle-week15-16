package com.jungle.bulletin.controller;

// 회원가입 / 로그인 API 엔드포인트
import com.jungle.bulletin.dto.AuthResponse;
import com.jungle.bulletin.dto.LoginRequest;
import com.jungle.bulletin.dto.SignupRequest;
import com.jungle.bulletin.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController              // JSON 응답을 반환하는 Controller
@RequestMapping("/api/auth") // 모든 URL 앞에 /api/auth 붙음
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService; // 실제 로직은 Service에 위임

    @PostMapping("/signup") // POST /api/auth/signup
    public ResponseEntity<String> signup(@RequestBody SignupRequest request) {
        authService.signup(request); // Service에 회원가입 처리 위임
        return ResponseEntity.ok("회원가입 성공");
    }

    @PostMapping("/login") // POST /api/auth/login
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request); // JWT 토큰 받아옴
        return ResponseEntity.ok(response); // { "token": "..." } 형태로 반환
    }
}