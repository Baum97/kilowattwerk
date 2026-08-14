import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Wind } from './wind';

describe('Wind', () => {
  let component: Wind;
  let fixture: ComponentFixture<Wind>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Wind]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Wind);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
