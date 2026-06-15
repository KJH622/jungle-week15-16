package com.jungle.bulletin.service;

// 회원가입 / 로그인 비즈니스 로직 처리
import com.jungle.bulletin.dto.AuthResponse;
import com.jungle.bulletin.dto.LoginRequest;
import com.jungle.bulletin.dto.SignupRequest;
import com.jungle.bulletin.entity.User;
import com.jungle.bulletin.repository.UserRepository;
import com.jungle.bulletin.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;  // DB 조회/저장
    private final PasswordEncoder passwordEncoder; // BCrypt 암호화
    private final JwtUtil jwtUtil;                 // JWT 발급

    // 회원가입
    public void signup(SignupRequest request) {
        // 이메일 중복 체크
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword())); // 비밀번호 암호화
        user.setNickname(request.getNickname());

        userRepository.save(user); // DB에 저장
    }

    // 로그인
    public AuthResponse login(LoginRequest request) {
        // 이메일로 유저 조회, 없으면 예외
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 틀렸습니다."));

        // 비밀번호 검증 (입력값 vs 암호화된 DB 값)
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 틀렸습니다.");
        }

        String token = jwtUtil.generateToken(user.getEmail()); // JWT 발급
        return new AuthResponse(token); // 토큰 담아서 반환
    }
}